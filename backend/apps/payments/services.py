import hmac
import hashlib
import logging
import secrets
import requests
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from apps.payments.models import Payment
from apps.tickets.services import generate_ticket_for_team

logger = logging.getLogger(__name__)


def is_razorpay_configured():
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET
    if not key_id or not key_secret:
        return False
    if not (key_id.startswith('rzp_test_') or key_id.startswith('rzp_live_')):
        return False
    return True


def is_razorpay_live():
    return settings.RAZORPAY_ENV == 'LIVE' or settings.RAZORPAY_KEY_ID.startswith('rzp_live_')


def _mark_payment_success(payment, payment_reference, gateway_data=None):
    """
    Idempotently confirms payment and team registration, then generates & emails the E-Ticket.
    """
    team = payment.team
    if payment.payment_status == 'SUCCESS' and team.payment_status == 'SUCCESS':
        generate_ticket_for_team(team, send_email=False)
        return payment

    with transaction.atomic():
        payment.payment_status = 'SUCCESS'
        payment.payment_reference = payment_reference or payment.payment_reference or f"RZP_{payment.order_id}"
        payment.payment_timestamp = timezone.now()
        if gateway_data:
            payment.gateway_response = gateway_data
        payment.save()

        team.payment_status = 'SUCCESS'
        team.registration_status = 'CONFIRMED'
        team.save(update_fields=['payment_status', 'registration_status'])

        # Generate E-Ticket PDF + QR and email both members
        generate_ticket_for_team(team, send_email=True)

    return payment


def create_razorpay_order(team):
    """
    Creates a Razorpay Order server-side (amount strictly enforced on backend)
    and saves a pending Payment row in PostgreSQL.
    """
    if team.payment_status == 'SUCCESS':
        raise ValueError("Team has already completed payment.")

    amount_inr = int(settings.REGISTRATION_FEE_INR)
    amount_paise = amount_inr * 100
    receipt_id = f"{team.registration_id}_{secrets.token_hex(3).upper()}"[:40]

    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt_id,
        "notes": {
            "team_id": str(team.id),
            "registration_id": team.registration_id,
            "team_name": team.team_name,
            "event": settings.EVENT_NAME,
        },
    }

    gateway_resp = {}
    if is_razorpay_configured():
        url = f"{settings.RAZORPAY_API_BASE_URL}/orders"
        try:
            resp = requests.post(
                url,
                json=payload,
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                timeout=15,
            )
            gateway_resp = resp.json()
            if resp.status_code in (200, 201) and gateway_resp.get("id"):
                order_id = gateway_resp["id"]
            else:
                err_desc = gateway_resp.get("error", {}).get("description", "Failed to create Razorpay order")
                logger.error(f"Razorpay order creation error: {gateway_resp}")
                raise ValueError(f"Razorpay error: {err_desc}")
        except requests.RequestException as e:
            logger.error(f"Razorpay connection failed: {e}")
            raise ValueError(f"Could not connect to Razorpay payment gateway: {str(e)}")
    else:
        # Development / Test mock fallback until Razorpay API keys are configured
        order_id = f"order_mock_{team.registration_id}_{secrets.token_hex(4).upper()}"
        gateway_resp = {
            "id": order_id,
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "status": "created",
            "mode": "MOCK_SANDBOX",
        }

    payment = Payment.objects.create(
        team=team,
        order_id=order_id,
        amount=amount_inr,
        currency="INR",
        payment_status="PENDING",
        payment_session_id=receipt_id,
        gateway_response=gateway_resp,
    )
    return payment


def verify_razorpay_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verifies Razorpay Checkout signature: HMAC-SHA256(order_id + '|' + payment_id, KEY_SECRET).
    """
    secret = settings.RAZORPAY_KEY_SECRET
    if not secret or not razorpay_signature:
        return False
    message = f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def verify_and_confirm_razorpay_payment(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verifies Razorpay signature AND confirms actual payment capture status with Razorpay API.
    Idempotent and tamper-proof.
    """
    try:
        payment = Payment.objects.select_related('team').get(order_id=razorpay_order_id)
    except Payment.DoesNotExist:
        return False, "Payment order not found.", None

    if payment.payment_status == 'SUCCESS':
        generate_ticket_for_team(payment.team, send_email=False)
        return True, "Payment already verified successfully.", payment

    if not is_razorpay_configured():
        return False, "Razorpay credentials are not configured on the server.", payment

    # 1. Verify cryptographic signature
    if not verify_razorpay_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        logger.warning(f"Rejected Razorpay payment verification due to invalid signature for order {razorpay_order_id}")
        return False, "Invalid payment signature. Verification rejected.", payment

    # 2. Server-to-server verification with Razorpay Payments API
    expected_paise = int(float(payment.amount) * 100)
    try:
        resp = requests.get(
            f"{settings.RAZORPAY_API_BASE_URL}/payments/{razorpay_payment_id}",
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=15,
        )
        rzp_payment = resp.json()
        if resp.status_code != 200:
            logger.error(f"Razorpay payment fetch failed: {rzp_payment}")
            return False, "Could not confirm payment status with Razorpay.", payment

        if rzp_payment.get("order_id") != razorpay_order_id:
            logger.warning(f"Order mismatch: expected {razorpay_order_id}, got {rzp_payment.get('order_id')}")
            return False, "Payment order mismatch.", payment

        if int(rzp_payment.get("amount", 0)) != expected_paise:
            logger.warning(f"Amount mismatch: expected {expected_paise}, got {rzp_payment.get('amount')}")
            return False, "Payment amount mismatch.", payment

        rzp_status = rzp_payment.get("status")
        if rzp_status in ("captured", "authorized"):
            _mark_payment_success(payment, razorpay_payment_id, gateway_data=rzp_payment)
            return True, "Payment successfully verified and confirmed!", payment
        elif rzp_status == "failed":
            payment.payment_status = 'FAILED'
            payment.gateway_response = rzp_payment
            payment.save(update_fields=['payment_status', 'gateway_response'])
            return False, "Payment failed at Razorpay.", payment
        else:
            return False, f"Payment status is '{rzp_status}'. Please wait or retry.", payment

    except requests.RequestException as e:
        logger.error(f"Error connecting to Razorpay API: {e}")
        return False, "Could not reach Razorpay verification server.", payment


def verify_payment_with_gateway(order_id):
    """
    Fetches payments for a Razorpay order server-side and confirms if any payment is captured.
    """
    try:
        payment = Payment.objects.select_related('team').get(order_id=order_id)
    except Payment.DoesNotExist:
        return False, "Payment order not found.", None

    if payment.payment_status == 'SUCCESS':
        generate_ticket_for_team(payment.team, send_email=False)
        return True, "Payment already verified successfully.", payment

    if is_razorpay_configured():
        try:
            resp = requests.get(
                f"{settings.RAZORPAY_API_BASE_URL}/orders/{order_id}/payments",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                timeout=15,
            )
            data = resp.json()
            items = data.get("items", []) if resp.status_code == 200 else []
            expected_paise = int(float(payment.amount) * 100)
            for item in items:
                if item.get("status") in ("captured", "authorized") and int(item.get("amount", 0)) == expected_paise:
                    _mark_payment_success(payment, item.get("id"), gateway_data=item)
                    return True, "Payment successfully verified and confirmed!", payment
            return False, "Payment not completed yet.", payment
        except requests.RequestException as e:
            logger.error(f"Error fetching Razorpay order payments: {e}")
            return False, f"Gateway connection error: {str(e)}", payment
    else:
        if payment.gateway_response.get("simulated_status") == "SUCCESS":
            _mark_payment_success(payment, f"SIM_{secrets.token_hex(6).upper()}")
            return True, "Simulated payment verified!", payment
        return False, "Payment is still pending.", payment


def verify_razorpay_webhook_signature(raw_body_bytes, signature):
    """
    Verifies Razorpay X-Razorpay-Signature header using HMAC-SHA256.
    """
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret or not signature:
        return False
    try:
        expected = hmac.new(secret.encode('utf-8'), raw_body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
    except Exception as e:
        logger.error(f"Razorpay webhook signature verification failed: {e}")
        return False


def simulate_sandbox_payment(order_id):
    """
    Test-only helper when Razorpay keys are not yet configured.
    Blocked automatically in LIVE mode.
    """
    if is_razorpay_live():
        return False, "Payment simulation is disabled in LIVE mode."

    try:
        payment = Payment.objects.select_related('team').get(order_id=order_id)
    except Payment.DoesNotExist:
        return False, "Payment order not found."

    _mark_payment_success(
        payment,
        payment_reference=f"pay_mock_{secrets.token_hex(6).upper()}",
        gateway_data={
            **payment.gateway_response,
            "simulated_status": "SUCCESS",
            "simulated_at": timezone.now().isoformat(),
        },
    )
    return True, "Simulated test payment successfully processed!"
