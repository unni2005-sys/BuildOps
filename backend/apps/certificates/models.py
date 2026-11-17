import secrets
from django.db import models
from apps.teams.models import TeamMember


def generate_certificate_id():
    # E.g. CERT-2026-A1B2C3D4
    rand_id = secrets.token_hex(4).upper()
    return f"CERT-2026-{rand_id}"


class Certificate(models.Model):
    member = models.OneToOneField(
        TeamMember,
        on_delete=models.CASCADE,
        related_name='certificate'
    )
    certificate_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_certificate_id
    )
    pdf_path = models.CharField(max_length=255, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'certificates'
        ordering = ['-generated_at']

    def __str__(self):
        return f"Certificate {self.certificate_id} for {self.member.full_name}"
