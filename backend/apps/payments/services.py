import io
import base64
import logging
import secrets
import urllib.parse
from PIL import Image
import qrcode
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from apps.payments.models import Payment
from apps.tickets.services import generate_ticket_for_team

logger = logging.getLogger(__name__)


def get_upi_details(team=None):
    """
    Returns configured UPI ID, Payee Name, Fee Amount, and standard UPI deep-link URI.
    """
    upi_id = getattr(settings, 'UPI_ID', 'unniacc9961@okaxis').strip()
    payee_name = getattr(settings, 'UPI_PAYEE_NAME', 'Unnikrishnan M').strip()
    phone_number = getattr(settings, 'UPI_PHONE_NUMBER', '9497290648').strip()
    amount = int(getattr(settings, 'REGISTRATION_FEE_INR', 500))

    reg_id = team.registration_id if team else "BUILD-OPS"
    note = f"BuildOps-{reg_id}"

    params = {
        'pa': upi_id,
        'pn': payee_name,
        'am': f"{amount:.2f}",
        'cu': 'INR',
        'tn': note,
    }
    upi_uri = f"upi://pay?{urllib.parse.urlencode(params)}"

    return {
        'upi_id': upi_id,
        'payee_name': payee_name,
        'phone_number': phone_number,
        'amount': amount,
        'currency': 'INR',
        'registration_id': reg_id,
        'transaction_note': note,
        'upi_uri': upi_uri,
    }


def generate_upi_qr_code_png(team=None):
    """
    Generates a crisp PNG QR code for the UPI payment URI.
    """
    details = get_upi_details(team)
    upi_uri = details['upi_uri']

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(upi_uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()


def record_payment_proof(team, screenshot_file, transaction_id=None, gateway_meta=None):
    """
    Records or updates a payment proof submission for a team, marking the payment
    and team status as VERIFICATION_PENDING.
    Also creates a persistent base64 data URI in database so container restarts never lose user uploads.
    """
    if team.payment_status == 'SUCCESS':
        raise ValueError("Team has already completed payment and is confirmed.")

    order_id = f"UPI-{team.registration_id}-{secrets.token_hex(3).upper()}"
    amount = getattr(settings, 'REGISTRATION_FEE_INR', 500)
    meta = dict(gateway_meta or {})

    # Generate persistent Data URI backup so Render container restarts never lose user uploads
    if screenshot_file:
        try:
            screenshot_file.seek(0)
            raw_bytes = screenshot_file.read()
            screenshot_file.seek(0)

            # Optimize with PIL to ensure high quality while keeping size ~150-300KB
            try:
                img = Image.open(io.BytesIO(raw_bytes))
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                img.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
                opt_buf = io.BytesIO()
                img.save(opt_buf, format='JPEG', quality=82, optimize=True)
                opt_bytes = opt_buf.getvalue()
                b64_str = base64.b64encode(opt_bytes).decode('utf-8')
                content_type = 'image/jpeg'
            except Exception:
                b64_str = base64.b64encode(raw_bytes).decode('utf-8')
                content_type = getattr(screenshot_file, 'content_type', 'image/jpeg')

            meta['screenshot_data_uri'] = f"data:{content_type};base64,{b64_str}"
        except Exception as e:
            logger.warning(f"Could not create persistent screenshot data URI: {e}")

    with transaction.atomic():
        payment = Payment.objects.create(
            team=team,
            order_id=order_id,
            payment_reference=transaction_id.strip() if transaction_id else None,
            amount=amount,
            currency='INR',
            payment_status='VERIFICATION_PENDING',
            payment_timestamp=timezone.now(),
            screenshot=screenshot_file,
            gateway_response=meta,
        )

        team.payment_status = 'VERIFICATION_PENDING'
        team.save(update_fields=['payment_status'])

    return payment


def approve_payment(team, admin_user=None):
    """
    Approves a team's payment, marks status SUCCESS and CONFIRMED,
    and generates/emails the official digital gate pass.
    """
    should_send_email = False
    with transaction.atomic():
        payment = team.payments.order_by('-created_at').first()
        if not payment:
            payment = Payment.objects.create(
                team=team,
                order_id=f"MANUAL-{team.registration_id}-{secrets.token_hex(3).upper()}",
                amount=getattr(settings, 'REGISTRATION_FEE_INR', 500),
                currency='INR',
                payment_status='SUCCESS',
                payment_timestamp=timezone.now(),
            )

        payment.payment_status = 'SUCCESS'
        payment.verified_by = admin_user
        payment.verified_at = timezone.now()
        payment.rejection_reason = ''
        payment.save()

        if team.payment_status != 'SUCCESS' or team.registration_status != 'CONFIRMED':
            team.payment_status = 'SUCCESS'
            team.registration_status = 'CONFIRMED'
            team.save(update_fields=['payment_status', 'registration_status'])
            should_send_email = True

    # Generate PNG gate pass and email both members outside DB transaction
    generate_ticket_for_team(team, send_email=should_send_email)
    return payment


def reject_payment(team, reason=""):
    """
    Rejects payment proof with an optional reason, allowing the student to re-upload.
    """
    with transaction.atomic():
        payment = team.payments.order_by('-created_at').first()
        if payment:
            payment.payment_status = 'REJECTED'
            payment.rejection_reason = reason.strip() or "Payment verification failed. Please verify the amount and UTR number and re-upload."
            payment.save(update_fields=['payment_status', 'rejection_reason'])

        team.payment_status = 'REJECTED'
        team.save(update_fields=['payment_status'])

    return payment
