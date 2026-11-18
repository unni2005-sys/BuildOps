import os
import io
import qrcode
from django.conf import settings
from django.http import FileResponse, HttpResponse, Http404
from django.db.models import Q
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from apps.accounts.models import User
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import Team, TeamMember
from apps.tickets.models import Ticket
from apps.tickets.services import generate_ticket_for_team
from apps.notifications.services import send_ticket_email


class MyTicketView(APIView):
    """
    Retrieves the ticket for the authenticated student's team.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        member = TeamMember.objects.filter(
            Q(user=user) | Q(email=user.email.lower())
        ).exclude(team__registration_status='CANCELLED').select_related('team').first()

        if not member:
            team = Team.objects.filter(team_leader=user).exclude(registration_status='CANCELLED').first()
            if not team:
                return Response({'error': 'No team membership found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            team = member.team

        if team.payment_status != 'SUCCESS':
            return Response({'error': 'Payment has not been completed for this team.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure ticket is generated
        try:
            ticket = team.ticket
        except Ticket.DoesNotExist:
            ticket = generate_ticket_for_team(team)

        return Response({
            'ticket_id': ticket.id,
            'qr_token': ticket.qr_token,
            'status': ticket.ticket_status,
            'generated_at': ticket.generated_at,
            'download_url': f"/api/tickets/{ticket.id}/download/",
            'qr_image_url': f"/api/tickets/{ticket.id}/qr/",
            'team': {
                'id': team.id,
                'registration_id': team.registration_id,
                'team_name': team.team_name,
                'college_name': team.college_name,
                'attendance_status': team.attendance_status
            }
        })


class TicketQRImageView(APIView):
    """
    Renders the QR code PNG image for a team ticket.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, pk):
        try:
            ticket = Ticket.objects.select_related('team').get(pk=pk)
        except Ticket.DoesNotExist:
            raise Http404("Ticket not found.")

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(ticket.qr_token)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#0f172a", back_color="white")

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return HttpResponse(buf.getvalue(), content_type='image/png')


class DownloadTicketView(APIView):
    """
    Serves the ticket PDF to authenticated team members or admins.
    Supports both Authorization header and ?token=<jwt> query parameter.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, pk):
        try:
            ticket = Ticket.objects.select_related('team').get(pk=pk)
        except Ticket.DoesNotExist:
            raise Http404("Ticket not found.")

        # Authenticate user from header or query param
        user = request.user
        if not user or not user.is_authenticated:
            token_str = request.query_params.get('token')
            if token_str:
                try:
                    decoded = AccessToken(token_str)
                    user_id = decoded.get('user_id')
                    user = User.objects.get(id=user_id)
                except Exception:
                    user = None

        if not user or not user.is_authenticated:
            return Response({'error': 'Authentication credentials required.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Permission check: User must be admin or belong to this team
        is_admin = user.role == 'ADMIN' or user.is_staff or user.is_superuser
        is_leader = (ticket.team.team_leader == user)
        is_member = ticket.team.members.filter(
            Q(user=user) | Q(email=user.email.lower())
        ).exists()

        if not (is_admin or is_leader or is_member):
            return Response({'error': 'You are not authorized to download this ticket.'}, status=status.HTTP_403_FORBIDDEN)

        # Ensure shareable PNG ticket exists on disk; regenerate if missing or legacy PDF
        full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path) if ticket.pdf_path else None
        if not full_path or not full_path.lower().endswith('.png') or not os.path.exists(full_path):
            ticket = generate_ticket_for_team(ticket.team, send_email=False)
            full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path)

        if not os.path.exists(full_path):
            return Response({'error': 'Ticket image could not be found.'}, status=status.HTTP_404_NOT_FOUND)

        filename = f"BuildOps_Pass_{ticket.team.registration_id}.png"
        response = FileResponse(open(full_path, 'rb'), content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AdminResendTicketEmailView(APIView):
    """
    Admin endpoint to resend ticket email to both team members.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request, pk):
        try:
            ticket = Ticket.objects.select_related('team').get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path) if ticket.pdf_path else None
        if not full_path or not full_path.lower().endswith('.png') or not os.path.exists(full_path):
            ticket = generate_ticket_for_team(ticket.team, send_email=False)
            full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path)

        results = send_ticket_email(ticket.team, ticket, pdf_path=full_path)
        return Response({
            'message': 'Ticket email dispatched to team members.',
            'recipients': results
        }, status=status.HTTP_200_OK)
