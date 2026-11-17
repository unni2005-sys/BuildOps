import secrets
from django.db import models
from apps.teams.models import Team


def generate_qr_token():
    # Cryptographically secure random token
    return f"TKT-{secrets.token_urlsafe(24)}"


class Ticket(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('CANCELLED', 'Cancelled'),
    )

    team = models.OneToOneField(
        Team,
        on_delete=models.CASCADE,
        related_name='ticket'
    )
    qr_token = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        default=generate_qr_token
    )
    ticket_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )
    pdf_path = models.CharField(max_length=255, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tickets'
        ordering = ['-generated_at']

    def __str__(self):
        return f"Ticket for {self.team.team_name} [{self.qr_token}]"
