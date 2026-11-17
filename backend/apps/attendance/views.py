from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserRole
from apps.attendance.models import AttendanceLog
from apps.teams.models import Team
from apps.teams.serializers import TeamDetailSerializer
from apps.attendance.services import validate_team_for_checkin, perform_team_check_in


class ValidateTokenView(APIView):
    """
    Validates a scanned QR token or registration ID before marking check-in.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request):
        token_or_id = request.data.get('token') or request.data.get('registration_id')
        if not token_or_id:
            return Response({'error': 'Token or registration ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = validate_team_for_checkin(token_or_id)
        team_data = TeamDetailSerializer(result['team']).data if result.get('team') else None

        return Response({
            'valid': result['valid'],
            'already_arrived': result.get('already_arrived', False),
            'ready_for_checkin': result.get('ready_for_checkin', False),
            'message': result['message'],
            'team': team_data
        }, status=status.HTTP_200_OK if result['valid'] else status.HTTP_400_BAD_REQUEST)


class CheckInView(APIView):
    """
    Marks the team as ARRIVED, records attendance log with admin info,
    and automatically triggers certificate generation.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request):
        token_or_id = request.data.get('token') or request.data.get('registration_id')
        team_id = request.data.get('team_id')
        action_details = request.data.get('action_details', 'Admin QR Camera Scan')

        team = None
        if team_id:
            team = Team.objects.filter(pk=team_id).first()
        elif token_or_id:
            validation = validate_team_for_checkin(token_or_id)
            if not validation['valid']:
                return Response({'error': validation['message']}, status=status.HTTP_400_BAD_REQUEST)
            team = validation['team']

        if not team:
            return Response({'error': 'Team not found.'}, status=status.HTTP_404_NOT_FOUND)

        success, message = perform_team_check_in(team, request.user, action_details=action_details)
        if not success:
            return Response({'error': message, 'already_arrived': team.attendance_status == 'ARRIVED'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': message,
            'team': TeamDetailSerializer(team).data
        }, status=status.HTTP_200_OK)


class AttendanceLogsListView(APIView):
    """
    Lists recent check-in logs.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request):
        logs = AttendanceLog.objects.select_related('team', 'admin').order_by('-checkin_timestamp')[:100]
        data = [{
            'id': l.id,
            'team_name': l.team.team_name,
            'registration_id': l.team.registration_id,
            'admin_email': l.admin.email if l.admin else 'System',
            'action_details': l.action_details,
            'checkin_timestamp': l.checkin_timestamp
        } for l in logs]
        return Response({'count': len(data), 'logs': data})
