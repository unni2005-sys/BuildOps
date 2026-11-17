from django.db import models
from apps.teams.models import Team


class Payment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    )

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    order_id = models.CharField(max_length=100, unique=True, db_index=True)
    payment_reference = models.CharField(max_length=120, null=True, blank=True)
    payment_session_id = models.CharField(max_length=255, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    payment_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    payment_timestamp = models.DateTimeField(null=True, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_id} - {self.team.team_name} - {self.payment_status} ({self.amount} {self.currency})"
