import csv
from django.http import HttpResponse
from django.db.models import Sum, Count, Q
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from apps.accounts.models import User
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import Team, TeamMember
from apps.payments.models import Payment
from apps.attendance.models import AttendanceLog


def _safe_csv_cell(value):
    """Prevents Excel/Sheets CSV formula injection on user-supplied text fields."""
    if value is None:
        return ''
    text = str(value)
    if text and text[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + text
    return text


def get_authenticated_admin(request):
    """
    Authenticates admin from either Authorization header or ?token=<jwt> query parameter.
    """
    user = request.user
    if user and user.is_authenticated:
        if user.role == 'ADMIN' or user.is_staff or user.is_superuser:
            return user
        return None

    token_str = request.query_params.get('token')
    if token_str:
        try:
            decoded = AccessToken(token_str)
            u = User.objects.get(id=decoded.get('user_id'))
            if u.role == 'ADMIN' or u.is_staff or u.is_superuser:
                return u
        except Exception:
            return None
    return None


class AdminDashboardStatsView(APIView):
    """
    Returns aggregated metrics for the Admin Dashboard.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request):
        total_teams = Team.objects.exclude(registration_status='CANCELLED').count()
        total_participants = TeamMember.objects.exclude(team__registration_status='CANCELLED').count()
        
        successful_payments = Payment.objects.filter(payment_status='SUCCESS').count()
        pending_payments = Team.objects.filter(payment_status='PENDING').exclude(registration_status='CANCELLED').count()
        verification_pending = Team.objects.filter(payment_status='VERIFICATION_PENDING').exclude(registration_status='CANCELLED').count()

        revenue_result = Payment.objects.filter(payment_status='SUCCESS').aggregate(total=Sum('amount'))
        total_revenue = float(revenue_result['total'] or (successful_payments * int(getattr(settings, 'REGISTRATION_FEE_INR', 500))))

        arrived_teams = Team.objects.filter(attendance_status='ARRIVED').count()
        not_arrived_teams = Team.objects.filter(payment_status='SUCCESS', attendance_status='NOT_ARRIVED').count()

        return Response({
            'total_teams': total_teams,
            'total_participants': total_participants,
            'successful_payments': successful_payments,
            'pending_payments': pending_payments,
            'verification_pending': verification_pending,
            'total_revenue': total_revenue,
            'arrived_teams': arrived_teams,
            'not_arrived_teams': not_arrived_teams,
        })


class ExportTeamsCSVView(APIView):
    """
    Exports all teams to CSV.
    Supports both Authorization header and ?token=<jwt> query parameter.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        admin = get_authenticated_admin(request)
        if not admin:
            return Response({'error': 'Admin authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="buildathon_teams.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Registration ID',
            'Team Name',
            'College Name',
            'Payment Status',
            'Registration Status',
            'Attendance Status',
            'Leader Name',
            'Leader Email',
            'Leader Phone',
            'Member 2 Name',
            'Member 2 Email',
            'Member 2 Phone',
            'Created At',
            'Arrival Time'
        ])

        teams = Team.objects.prefetch_related('members').order_by('-created_at')
        for team in teams:
            members = list(team.members.all())
            m1 = next((m for m in members if m.member_role == 'LEADER' or m.user_id == team.team_leader_id), members[0] if members else None)
            m2 = next((m for m in members if m != m1), None)

            writer.writerow([
                team.registration_id,
                _safe_csv_cell(team.team_name),
                _safe_csv_cell(team.college_name),
                team.payment_status,
                team.registration_status,
                team.attendance_status,
                _safe_csv_cell(m1.full_name) if m1 else '',
                _safe_csv_cell(m1.email) if m1 else '',
                _safe_csv_cell(m1.mobile_number) if m1 else '',
                _safe_csv_cell(m2.full_name) if m2 else '',
                _safe_csv_cell(m2.email) if m2 else '',
                _safe_csv_cell(m2.mobile_number) if m2 else '',
                team.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                team.arrival_timestamp.strftime('%Y-%m-%d %H:%M:%S') if team.arrival_timestamp else ''
            ])

        return response


class ExportParticipantsCSVView(APIView):
    """
    Exports all individual participants to CSV.
    Supports both Authorization header and ?token=<jwt> query parameter.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        admin = get_authenticated_admin(request)
        if not admin:
            return Response({'error': 'Admin authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="buildathon_participants.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Participant Name',
            'Email',
            'Mobile Number',
            'Role',
            'Team Name',
            'Registration ID',
            'College Name',
            'Attendance Status'
        ])

        members = TeamMember.objects.select_related('team').order_by('team__team_name', 'member_role')
        for m in members:
            writer.writerow([
                _safe_csv_cell(m.full_name),
                _safe_csv_cell(m.email),
                _safe_csv_cell(m.mobile_number),
                m.member_role,
                _safe_csv_cell(m.team.team_name),
                m.team.registration_id,
                _safe_csv_cell(m.team.college_name),
                m.team.attendance_status
            ])

        return response


class ExportPaymentsCSVView(APIView):
    """
    Exports all payment transactions to CSV.
    Supports both Authorization header and ?token=<jwt> query parameter.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        admin = get_authenticated_admin(request)
        if not admin:
            return Response({'error': 'Admin authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="buildathon_payments.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Order ID',
            'Team Name',
            'Registration ID',
            'Amount',
            'Currency',
            'Status',
            'Payment Reference',
            'Payment Timestamp',
            'Created At'
        ])

        payments = Payment.objects.select_related('team').order_by('-created_at')
        for p in payments:
            writer.writerow([
                p.order_id,
                _safe_csv_cell(p.team.team_name),
                p.team.registration_id,
                p.amount,
                p.currency,
                p.payment_status,
                _safe_csv_cell(p.payment_reference or ''),
                p.payment_timestamp.strftime('%Y-%m-%d %H:%M:%S') if p.payment_timestamp else '',
                p.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        return response


class ExportAttendanceCSVView(APIView):
    """
    Exports attendance check-in logs to CSV.
    Supports both Authorization header and ?token=<jwt> query parameter.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        admin = get_authenticated_admin(request)
        if not admin:
            return Response({'error': 'Admin authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="buildathon_attendance.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Log ID',
            'Team Name',
            'Registration ID',
            'College Name',
            'Action Details',
            'Admin Email',
            'Check-in Timestamp'
        ])

        logs = AttendanceLog.objects.select_related('team', 'admin').order_by('-checkin_timestamp')
        for l in logs:
            writer.writerow([
                l.id,
                _safe_csv_cell(l.team.team_name),
                l.team.registration_id,
                _safe_csv_cell(l.team.college_name),
                _safe_csv_cell(l.action_details),
                l.admin.email if l.admin else 'System',
                l.checkin_timestamp.strftime('%Y-%m-%d %H:%M:%S')
            ])

        return response
