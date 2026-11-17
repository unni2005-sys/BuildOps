import uuid
import secrets
from django.db import models
from django.conf import settings


def generate_registration_id():
    # E.g. BUILD-A8F29C
    hex_code = secrets.token_hex(4).upper()
    return f"BUILD-{hex_code}"


class Team(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    )

    REGISTRATION_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    )

    ATTENDANCE_STATUS_CHOICES = (
        ('NOT_ARRIVED', 'Not Arrived'),
        ('ARRIVED', 'Arrived'),
    )

    registration_id = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        default=generate_registration_id
    )
    team_name = models.CharField(max_length=120)
    college_name = models.CharField(max_length=200)
    team_leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='led_teams'
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    registration_status = models.CharField(
        max_length=20,
        choices=REGISTRATION_STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    attendance_status = models.CharField(
        max_length=20,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='NOT_ARRIVED',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    arrival_timestamp = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'teams'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.team_name} ({self.registration_id})"

    @property
    def member_count(self):
        return self.members.count()

    @property
    def is_confirmed(self):
        return self.registration_status == 'CONFIRMED' and self.payment_status == 'SUCCESS'


class TeamMember(models.Model):
    ROLE_CHOICES = (
        ('LEADER', 'Leader'),
        ('MEMBER', 'Member'),
    )

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_memberships'
    )
    full_name = models.CharField(max_length=150)
    email = models.EmailField(db_index=True)
    mobile_number = models.CharField(max_length=20, db_index=True)
    member_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MEMBER')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'team_members'
        unique_together = ('team', 'email')
        ordering = ['member_role', 'id']

    def __str__(self):
        return f"{self.full_name} ({self.member_role}) - {self.team.team_name}"
