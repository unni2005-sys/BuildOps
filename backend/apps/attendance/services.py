import logging
from django.utils import timezone
from django.db import transaction
from apps.teams.models import Team
from apps.tickets.models import Ticket
from apps.attendance.models import AttendanceLog

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
    Atomically performs arrival check-in for the entire team using a row-level lock
    to prevent concurrent double check-ins across multiple gate scanners.
    """
    with transaction.atomic():
        locked_team = Team.objects.select_for_update().get(pk=team.pk)

        if locked_team.attendance_status == 'ARRIVED':
            arrival_str = (
                locked_team.arrival_timestamp.strftime('%Y-%m-%d %H:%M:%S')
                if locked_team.arrival_timestamp
                else 'Earlier'
            )
            return False, f"Team {locked_team.team_name} is already marked as arrived at {arrival_str}."

        if locked_team.payment_status != 'SUCCESS':
            return False, f"Cannot check in team with payment status: {locked_team.payment_status}"

        now = timezone.now()
        locked_team.attendance_status = 'ARRIVED'
        locked_team.arrival_timestamp = now
        locked_team.save(update_fields=['attendance_status', 'arrival_timestamp'])

        AttendanceLog.objects.create(
            team=locked_team,
            admin=admin_user if (admin_user and admin_user.is_authenticated) else None,
            action_details=action_details
        )

    # Keep caller's instance synced
    team.attendance_status = locked_team.attendance_status
    team.arrival_timestamp = locked_team.arrival_timestamp
    return True, f"Team '{locked_team.team_name}' [{locked_team.registration_id}] successfully marked as ARRIVED!"
