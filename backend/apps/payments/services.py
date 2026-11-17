import base64
import hmac
import hashlib
import json
import logging
import secrets
import requests
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from apps.payments.models import Payment
from apps.teams.models import Team
from apps.tickets.services import generate_ticket_for_team

logger = logging.getLogger(__name__)


def is_live_cashfree_configured():
    app_id = settings.CASHFREE_APP_ID
    secret = settings.CASHFREE_SECRET_KEY
    if not app_id or not secret:
        return False
    if "DEMO" in app_id or "test_app_id" in app_id:
        return False
    return True


def create_cashfree_order(team, return_url=None):
    """
    Creates a Cashfree Order on Cashfree Gateway and saves a pending Payment in DB.
    """
    # Check for existing successful payment
    if team.payment_status == 'SUCCESS':
        raise ValueError("Team has already completed payment.")

    order_id = f"ORDER_{team.registration_id}_{secrets.token_hex(3).upper()}"
    amount = float(settings.REGISTRATION_FEE_INR)

    leader = team.members.filter(member_role='LEADER').first()
    cust_id = f"CUST_{team.id}_{leader.id if leader else '0'}"
    cust_name = leader.full_name if leader else team.team_name
    cust_email = leader.email if leader else 'leader@buildathon.org'
    cust_phone = leader.mobile_number if leader else '9999999999'

    if not return_url:
        return_url = f"{settings.FRONTEND_URL}/payment-status?order_id={order_id}"

    payload = {
        "order_id": order_id,
        "order_amount": amount,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": cust_id,
            "customer_name": cust_name,
            "customer_email": cust_email,
            "customer_phone": cust_phone
        },
        "order_meta": {
            "return_url": return_url,
            "notify_url": f"{settings.BACKEND_URL}/api/payments/webhook/"
        },
        "order_note": f"Registration Fee for Team {team.team_name} [{team.registration_id}]"
    }

    payment_session_id = None
    gateway_resp = {}

    if is_live_cashfree_configured():
        headers = {
            "x-api-version": settings.CASHFREE_API_VERSION,
            "x-client-id": settings.CASHFREE_APP_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        url = f"{settings.CASHFREE_BASE_URL}/orders"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=15)
            gateway_resp = resp.json()
            if resp.status_code in (200, 201):
                payment_session_id = gateway_resp.get("payment_session_id")
            else:
                logger.error(f"Cashfree order creation error: {gateway_resp}")
                raise ValueError(f"Cashfree error: {gateway_resp.get('message', 'Failed to create order')}")
        except requests.RequestException as e:
            logger.error(f"Cashfree connection failed: {e}")
            raise ValueError(f"Could not connect to Cashfree payment gateway: {str(e)}")
    else:
        # Development / Sandbox mock fallback when credentials not populated yet
        payment_session_id = f"session_mock_{secrets.token_urlsafe(16)}"
        gateway_resp = {
            "order_id": order_id,
            "order_status": "ACTIVE",
            "payment_session_id": payment_session_id,
            "mode": "SANDBOX_MOCK"
        }

    payment = Payment.objects.create(
        team=team,
        order_id=order_id,
        amount=amount,
        currency="INR",
        payment_status="PENDING",
        payment_session_id=payment_session_id,
        gateway_response=gateway_resp
    )

    return payment


def verify_payment_with_gateway(order_id):
    """
    Verifies actual order and payment status from Cashfree or marks success in mock mode.
    Idempotent: generates ticket and confirms registration on success.
    """
    try:
        payment = Payment.objects.select_related('team').get(order_id=order_id)
    except Payment.DoesNotExist:
        return False, "Payment order not found.", None

    team = payment.team

    # Idempotent: If already processed as success
    if payment.payment_status == 'SUCCESS':
        # Ensure ticket exists
        ticket = generate_ticket_for_team(team)
        return True, "Payment already verified successfully.", payment

    is_paid = False
    payment_reference = None
    cf_response = {}

    if is_live_cashfree_configured():
        headers = {
            "x-api-version": settings.CASHFREE_API_VERSION,
            "x-client-id": settings.CASHFREE_APP_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
            "Accept": "application/json"
        }
        url = f"{settings.CASHFREE_BASE_URL}/orders/{order_id}"
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            cf_response = resp.json()
            if cf_response.get("order_status") == "PAID":
                is_paid = True
                payment_reference = cf_response.get("cf_order_id") or order_id
            elif cf_response.get("order_status") in ("EXPIRED", "CANCELLED"):
                payment.payment_status = 'FAILED'
                payment.gateway_response = cf_response
                payment.save(update_fields=['payment_status', 'gateway_response'])
                return False, f"Order status is {cf_response.get('order_status')}", payment
        except requests.RequestException as e:
            logger.error(f"Error fetching Cashfree order: {e}")
            return False, f"Gateway connection error: {str(e)}", payment
    else:
        # If in sandbox / mock mode, check if gateway_response marked it as simulated or allow verification
        if payment.gateway_response.get("simulated_status") == "SUCCESS":
            is_paid = True
            payment_reference = f"SIM_{secrets.token_hex(6).upper()}"
        else:
            return False, "Payment is still pending. In development mode, click 'Simulate Test Payment'.", payment

    if is_paid:
        with transaction.atomic():
            payment.payment_status = 'SUCCESS'
            payment.payment_reference = payment_reference or f"CF_{order_id}"
            payment.payment_timestamp = timezone.now()
            payment.gateway_response = cf_response or payment.gateway_response
            payment.save()

            team.payment_status = 'SUCCESS'
            team.registration_status = 'CONFIRMED'
            team.save(update_fields=['payment_status', 'registration_status'])

            # Generate E-Ticket and dispatch email
            ticket = generate_ticket_for_team(team)

        return True, "Payment successfully verified and confirmed!", payment

    return False, "Payment not completed yet.", payment


def verify_cashfree_signature(raw_body_bytes, timestamp, signature):
    """
    Verifies Cashfree webhook signature using HMAC-SHA256.
    """
    secret = settings.CASHFREE_WEBHOOK_SECRET
    if not secret:
        return False
    try:
        data_to_sign = f"{timestamp}{raw_body_bytes.decode('utf-8')}".encode('utf-8')
        computed_hash = hmac.new(secret.encode('utf-8'), data_to_sign, hashlib.sha256).digest()
        computed_signature = base64.b64encode(computed_hash).decode('utf-8')
        return hmac.compare_digest(computed_signature, signature)
    except Exception as e:
        logger.error(f"Webhook signature check failed: {e}")
        return False


def simulate_sandbox_payment(order_id):
    """
    Helper for test environments to simulate a successful payment without entering real card details.
    """
    try:
        payment = Payment.objects.select_related('team').get(order_id=order_id)
    except Payment.DoesNotExist:
        return False, "Payment order not found."

    team = payment.team
    with transaction.atomic():
        payment.payment_status = 'SUCCESS'
        payment.payment_reference = f"SIM_PAY_{secrets.token_hex(6).upper()}"
        payment.payment_timestamp = timezone.now()
        payment.gateway_response = {
            **payment.gateway_response,
            "simulated_status": "SUCCESS",
            "simulated_at": timezone.now().isoformat()
        }
        payment.save()

        team.payment_status = 'SUCCESS'
        team.registration_status = 'CONFIRMED'
        team.save(update_fields=['payment_status', 'registration_status'])

        # Generate ticket and email
        generate_ticket_for_team(team)

    return True, "Simulated payment successfully processed!"
