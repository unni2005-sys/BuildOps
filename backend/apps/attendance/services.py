import logging
from django.utils import timezone
from django.db import transaction
from apps.teams.models import Team
from apps.tickets.models import Ticket
from apps.attendance.models import AttendanceLog
from apps.certificates.services import generate_certificates_for_team

logger = logging.getLogger(__name__)


def validate_team_for_checkin(token_or_reg_id):
    """
    Validates QR token or Registration ID and inspects check-in eligibility.
    """
    token_or_reg_id = token_or_reg_id.strip()

    # Try lookup by QR token first
    ticket = Ticket.objects.select_related('team').prefetch_related('team__members').filter(qr_token=token_or_reg_id).first()
    team = None
    if ticket:
        team = ticket.team
    else:
        # Fallback to registration ID lookup
        team = Team.objects.prefetch_related('members').filter(registration_id__iexact=token_or_reg_id).first()

    if not team:
        return {
            'valid': False,
            'message': 'No matching ticket or registration ID found.',
            'team': None
        }

    # Verify payment & confirmation status
    if team.payment_status != 'SUCCESS' or team.registration_status != 'CONFIRMED':
        return {
            'valid': False,
            'message': f'Cannot check in. Team payment is {team.payment_status} and registration is {team.registration_status}.',
            'team': team,
            'is_paid': False
        }

    # Check if already arrived
    if team.attendance_status == 'ARRIVED':
        arrival_time_str = team.arrival_timestamp.strftime('%Y-%m-%d %H:%M:%S') if team.arrival_timestamp else 'Earlier'
        return {
            'valid': True,
            'already_arrived': True,
            'message': f'Already Arrived! This team checked in on {arrival_time_str}.',
            'team': team,
            'is_paid': True
        }

    return {
        'valid': True,
        'already_arrived': False,
        'ready_for_checkin': True,
        'message': 'Valid ticket. Ready for check-in.',
        'team': team,
        'is_paid': True
    }


def perform_team_check_in(team, admin_user, action_details="QR Camera Scan"):
    """
    Performs arrival check-in for the entire team, logs attendance, and automatically triggers
    certificate generation.
    """
    if team.attendance_status == 'ARRIVED':
        arrival_str = team.arrival_timestamp.strftime('%Y-%m-%d %H:%M:%S') if team.arrival_timestamp else 'Earlier'
        return False, f"Team {team.team_name} is already marked as arrived at {arrival_str}."

    if team.payment_status != 'SUCCESS':
        return False, f"Cannot check in team with payment status: {team.payment_status}"

    with transaction.atomic():
        now = timezone.now()
        team.attendance_status = 'ARRIVED'
        team.arrival_timestamp = now
        team.save(update_fields=['attendance_status', 'arrival_timestamp'])

        AttendanceLog.objects.create(
            team=team,
            admin=admin_user if (admin_user and admin_user.is_authenticated) else None,
            action_details=action_details
        )

    # Safely generate individual certificates
    try:
        generate_certificates_for_team(team)
    except Exception as e:
        logger.error(f"Error in automatic certificate generation for team {team.id}: {e}", exc_info=True)

    return True, f"Team '{team.team_name}' [{team.registration_id}] successfully marked as ARRIVED!"
