from django.db import models
from django.conf import settings
from apps.teams.models import Team


class AttendanceLog(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='attendance_logs'
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendances'
    )
    checkin_timestamp = models.DateTimeField(auto_now_add=True)
    action_details = models.CharField(max_length=255, default='QR Check-in')

    class Meta:
        db_table = 'attendance_logs'
        ordering = ['-checkin_timestamp']

    def __str__(self):
        return f"Attendance {self.team.team_name} at {self.checkin_timestamp}"
