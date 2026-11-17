from django.db import models


class EmailLog(models.Model):
    TYPE_CHOICES = (
        ('VERIFICATION', 'Verification Email'),
        ('TICKET', 'Ticket Delivery'),
        ('CERTIFICATE', 'Certificate Delivery'),
        ('GENERAL', 'General Notification'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
    )

    recipient_email = models.EmailField(db_index=True)
    email_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email_type} to {self.recipient_email} [{self.status}]"
