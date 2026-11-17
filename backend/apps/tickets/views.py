import os
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import TeamMember
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
        member = TeamMember.objects.filter(user=user).exclude(team__registration_status='CANCELLED').first()
        if not member:
            return Response({'error': 'No team membership found.'}, status=status.HTTP_404_NOT_FOUND)

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
            'team': {
                'id': team.id,
                'registration_id': team.registration_id,
                'team_name': team.team_name,
                'college_name': team.college_name,
                'attendance_status': team.attendance_status
            }
        })


class DownloadTicketView(APIView):
    """
    Serves the ticket PDF to authenticated team members or admins.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, pk):
        try:
            ticket = Ticket.objects.select_related('team').get(pk=pk)
        except Ticket.DoesNotExist:
            raise Http404("Ticket not found.")

        # Permission check: User must be admin or belong to this team
        user = request.user
        is_admin = user.role == 'ADMIN' or user.is_staff or user.is_superuser
        is_member = ticket.team.members.filter(user=user).exists() or ticket.team.members.filter(email=user.email.lower()).exists()

        if not (is_admin or is_member):
            return Response({'error': 'You are not authorized to download this ticket.'}, status=status.HTTP_403_FORBIDDEN)

        # Check if PDF exists on disk; regenerate if missing
        full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path) if ticket.pdf_path else None
        if not full_path or not os.path.exists(full_path):
            ticket = generate_ticket_for_team(ticket.team)
            full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path)

        if not os.path.exists(full_path):
            return Response({'error': 'Ticket PDF could not be found.'}, status=status.HTTP_404_NOT_FOUND)

        filename = f"Ticket_{ticket.team.registration_id}.pdf"
        response = FileResponse(open(full_path, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
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
        if not full_path or not os.path.exists(full_path):
            ticket = generate_ticket_for_team(ticket.team)
            full_path = os.path.join(settings.MEDIA_ROOT, ticket.pdf_path)

        results = send_ticket_email(ticket.team, ticket, pdf_path=full_path)
        return Response({
            'message': 'Ticket email dispatched to team members.',
            'recipients': results
        }, status=status.HTTP_200_OK)
