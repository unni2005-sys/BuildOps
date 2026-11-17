import os
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import Team, TeamMember
from apps.certificates.models import Certificate
from apps.certificates.services import generate_certificate_for_member, generate_certificates_for_team


class MyCertificateView(APIView):
    """
    Retrieves the participation certificate for the authenticated student.
    Available once the team's arrival has been verified.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        # Find team member corresponding to this user
        member = TeamMember.objects.select_related('team').filter(
            user=user
        ).exclude(team__registration_status='CANCELLED').first()

        if not member:
            # Check by email
            member = TeamMember.objects.select_related('team').filter(
                email=user.email.lower()
            ).exclude(team__registration_status='CANCELLED').first()

        if not member:
            return Response({'error': 'You are not registered as a member in any active team.'}, status=status.HTTP_404_NOT_FOUND)

        team = member.team
        if team.attendance_status != 'ARRIVED':
            return Response({
                'is_available': False,
                'message': 'Certificates will be unlocked after your team completes event check-in on the day of the event.',
                'attendance_status': team.attendance_status
            }, status=status.HTTP_200_OK)

        # Retrieve or generate certificate
        cert = getattr(member, 'certificate', None)
        if not cert:
            cert = generate_certificate_for_member(member)

        return Response({
            'is_available': True,
            'certificate_id': cert.certificate_id,
            'participant_name': member.full_name,
            'team_name': team.team_name,
            'registration_id': team.registration_id,
            'generated_at': cert.generated_at,
            'download_url': f"/api/certificates/{cert.id}/download/"
        }, status=status.HTTP_200_OK)


class DownloadCertificateView(APIView):
    """
    Serves the certificate PDF to the member or admin.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, pk):
        try:
            cert = Certificate.objects.select_related('member', 'member__team').get(pk=pk)
        except Certificate.DoesNotExist:
            raise Http404("Certificate not found.")

        user = request.user
        is_admin = user.role == 'ADMIN' or user.is_staff or user.is_superuser
        is_owner = (cert.member.user == user) or (cert.member.email.lower() == user.email.lower())

        if not (is_admin or is_owner):
            return Response({'error': 'You are not authorized to download this certificate.'}, status=status.HTTP_403_FORBIDDEN)

        full_path = os.path.join(settings.MEDIA_ROOT, cert.pdf_path) if cert.pdf_path else None
        if not full_path or not os.path.exists(full_path):
            cert = generate_certificate_for_member(cert.member)
            full_path = os.path.join(settings.MEDIA_ROOT, cert.pdf_path)

        if not os.path.exists(full_path):
            return Response({'error': 'Certificate PDF file not found.'}, status=status.HTTP_404_NOT_FOUND)

        filename = f"Certificate_{cert.certificate_id}.pdf"
        response = FileResponse(open(full_path, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class AdminRegenerateCertificatesView(APIView):
    """
    Allows admins to regenerate certificates for a team.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request, team_id):
        try:
            team = Team.objects.prefetch_related('members').get(pk=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

        certs = generate_certificates_for_team(team)
        return Response({
            'message': f'Regenerated {len(certs)} certificates for Team {team.team_name}',
            'certificates': [{'id': c.id, 'certificate_id': c.certificate_id, 'member': c.member.full_name} for c in certs]
        })


class AdminCertificateListView(APIView):
    """
    Lists all generated certificates.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request):
        certs = Certificate.objects.select_related('member', 'member__team').order_by('-generated_at')
        data = [{
            'id': c.id,
            'certificate_id': c.certificate_id,
            'member_name': c.member.full_name,
            'member_email': c.member.email,
            'team_name': c.member.team.team_name,
            'registration_id': c.member.team.registration_id,
            'generated_at': c.generated_at,
            'download_url': f"/api/certificates/{c.id}/download/"
        } for c in certs]
        return Response({'count': len(data), 'certificates': data})
