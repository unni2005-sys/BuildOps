import hmac
import hashlib
import logging
import secrets
import razorpay
from razorpay.errors import BadRequestError, GatewayError, ServerError, SignatureVerificationError
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from apps.payments.models import Payment
from apps.tickets.services import generate_ticket_for_team

logger = logging.getLogger(__name__)


class RazorpayAuthError(Exception):
    """Raised when Razorpay rejects API credentials (HTTP 401)."""


class RazorpayGatewayError(Exception):
    """Raised when Razorpay API returns an upstream or network error (HTTP 500)."""


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


def get_razorpay_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _mark_payment_success(payment, payment_reference, gateway_data=None):
    """
    Idempotently confirms payment and team registration using a row-level DB lock,
    then generates & emails the PNG E-Ticket AFTER the DB transaction commits
    (prevents duplicate emails on concurrent webhook + callback and avoids holding
    Supabase pooler connections open during external Resend HTTPS calls).
    """
    should_send_email = False

    with transaction.atomic():
        locked_payment = Payment.objects.select_for_update().select_related('team').get(pk=payment.pk)
        team = locked_payment.team

        if locked_payment.payment_status != 'SUCCESS' or team.payment_status != 'SUCCESS':
            locked_payment.payment_status = 'SUCCESS'
            locked_payment.payment_reference = (
                payment_reference or locked_payment.payment_reference or f"RZP_{locked_payment.order_id}"
            )
            locked_payment.payment_timestamp = timezone.now()
            if gateway_data:
                locked_payment.gateway_response = gateway_data
            locked_payment.save()

            team.payment_status = 'SUCCESS'
            team.registration_status = 'CONFIRMED'
            team.save(update_fields=['payment_status', 'registration_status'])
            should_send_email = True

    # Generate PNG ticket and dispatch confirmation emails outside the DB transaction
    generate_ticket_for_team(team, send_email=should_send_email)
    return locked_payment


def create_razorpay_order(team):
    """
    Creates a Razorpay Order server-side using the official Razorpay Python SDK
    (amount strictly enforced on backend, minimum 100 paise) and saves a pending Payment row.
    """
    if team.payment_status == 'SUCCESS':
        raise ValueError("Team has already completed payment.")

    amount_inr = int(settings.REGISTRATION_FEE_INR)
    amount_paise = amount_inr * 100
    if amount_paise < 100:
        raise ValueError("Minimum Razorpay order amount is 100 paise (₹1).")

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
        client = get_razorpay_client()
        try:
            gateway_resp = client.order.create(data=payload)
            order_id = gateway_resp.get("id")
            if not order_id:
                logger.error(f"Razorpay returned unexpected order payload: {gateway_resp}")
                raise RazorpayGatewayError("Razorpay did not return a valid order ID.")
        except BadRequestError as e:
            err_msg = str(e)
            logger.error(f"Razorpay BadRequestError during order creation: {err_msg}")
            if "authentication" in err_msg.lower() or "unauthorized" in err_msg.lower():
                raise RazorpayAuthError("Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
            raise RazorpayGatewayError(f"Razorpay order creation failed: {err_msg}")
        except (GatewayError, ServerError) as e:
            logger.error(f"Razorpay API error during order creation: {e}")
            raise RazorpayGatewayError(f"Razorpay gateway error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected Razorpay connection error: {e}")
            raise RazorpayGatewayError(f"Could not connect to Razorpay payment gateway: {str(e)}")
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
    Verifies Razorpay HMAC-SHA256 signature AND confirms actual payment capture status with Razorpay API.
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

    # 1. Verify cryptographic HMAC-SHA256 signature (SDK + constant-time check)
    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        })
    except SignatureVerificationError:
        logger.warning(f"Rejected Razorpay payment verification due to invalid signature for order {razorpay_order_id}")
        return False, "Invalid payment signature. Verification rejected.", payment

    if not verify_razorpay_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        return False, "Invalid payment signature. Verification rejected.", payment

    # 2. Server-to-server verification with Razorpay Payments API
    expected_paise = int(float(payment.amount) * 100)
    try:
        rzp_payment = client.payment.fetch(razorpay_payment_id)

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

    except Exception as e:
        logger.error(f"Error connecting to Razorpay API during payment verification: {e}")
        return False, "Could not confirm payment status with Razorpay.", payment


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
        client = get_razorpay_client()
        try:
            data = client.order.payments(order_id)
            items = data.get("items", []) if isinstance(data, dict) else []
            expected_paise = int(float(payment.amount) * 100)
            for item in items:
                if item.get("status") in ("captured", "authorized") and int(item.get("amount", 0)) == expected_paise:
                    _mark_payment_success(payment, item.get("id"), gateway_data=item)
                    return True, "Payment successfully verified and confirmed!", payment
            return False, "Payment not completed yet.", payment
        except Exception as e:
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
