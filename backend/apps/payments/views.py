import json
import logging
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.db.models import Q
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import Team, TeamMember
from apps.payments.models import Payment
from apps.payments.serializers import PaymentSerializer
from apps.payments.services import (
    RazorpayAuthError,
    RazorpayGatewayError,
    is_razorpay_configured,
    is_razorpay_live,
    create_razorpay_order,
    verify_and_confirm_razorpay_payment,
    verify_payment_with_gateway,
    verify_razorpay_webhook_signature,
    simulate_sandbox_payment,
)

logger = logging.getLogger(__name__)


def _user_can_access_team(user, team):
    if not user or not user.is_authenticated:
        return False
    if user.role == 'ADMIN' or user.is_staff or user.is_superuser:
        return True
    if team.team_leader_id == user.id:
        return True
    return team.members.filter(Q(user=user) | Q(email=user.email.lower())).exists()


class CreateOrderView(APIView):
    """
    Creates a Razorpay payment order for the student's pending team.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        member = TeamMember.objects.filter(
            Q(user=user) | Q(email=user.email.lower())
        ).exclude(team__registration_status='CANCELLED').select_related('team').first()

        if not member:
            team = Team.objects.filter(team_leader=user).exclude(registration_status='CANCELLED').first()
        else:
            team = member.team

        if not team:
            return Response({'error': 'You do not have any registered team.'}, status=status.HTTP_400_BAD_REQUEST)

        if team.payment_status == 'SUCCESS':
            return Response({'error': 'Team has already completed payment.'}, status=status.HTTP_400_BAD_REQUEST)

        leader = team.members.filter(member_role='LEADER').first() or team.members.first()

        try:
            payment = create_razorpay_order(team)
            configured = is_razorpay_configured()
            return Response({
                'gateway': 'RAZORPAY',
                'order_id': payment.order_id,
                'key_id': settings.RAZORPAY_KEY_ID if configured else '',
                'amount': float(payment.amount),
                'amount_paise': int(float(payment.amount) * 100),
                'currency': payment.currency,
                'environment': settings.RAZORPAY_ENV,
                'is_mock': not configured,
                'prefill': {
                    'name': leader.full_name if leader else user.full_name,
                    'email': leader.email if leader else user.email,
                    'contact': leader.mobile_number if leader else getattr(user, 'mobile_number', ''),
                },
                'team': {
                    'id': team.id,
                    'registration_id': team.registration_id,
                    'team_name': team.team_name,
                },
            }, status=status.HTTP_201_CREATED)
        except RazorpayAuthError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except RazorpayGatewayError as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class VerifyRazorpayPaymentView(APIView):
    """
    Verifies Razorpay Checkout callback signature and confirms actual capture via Razorpay API.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        razorpay_order_id = request.data.get('razorpay_order_id', '').strip()
        razorpay_payment_id = request.data.get('razorpay_payment_id', '').strip()
        razorpay_signature = request.data.get('razorpay_signature', '').strip()

        if not (razorpay_order_id and razorpay_payment_id and razorpay_signature):
            return Response(
                {'error': 'Missing Razorpay verification fields (order_id, payment_id, signature).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_obj = Payment.objects.select_related('team').filter(order_id=razorpay_order_id).first()
        if not payment_obj:
            return Response({'error': 'Payment order not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _user_can_access_team(request.user, payment_obj.team):
            return Response({'error': 'You are not authorized to verify this order.'}, status=status.HTTP_403_FORBIDDEN)

        success, message, payment = verify_and_confirm_razorpay_payment(
            razorpay_order_id, razorpay_payment_id, razorpay_signature
        )
        if not payment:
            return Response({'error': message}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': success,
            'message': message,
            'payment': PaymentSerializer(payment).data,
            'team_status': payment.team.registration_status,
            'whatsapp_group_link': settings.WHATSAPP_GROUP_LINK if (success and settings.WHATSAPP_GROUP_LINK) else None,
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    """
    Verifies order status directly against Razorpay server-side API.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, order_id):
        payment_obj = Payment.objects.select_related('team').filter(order_id=order_id).first()
        if not payment_obj:
            return Response({'error': 'Payment order not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _user_can_access_team(request.user, payment_obj.team):
            return Response({'error': 'You are not authorized to access this order.'}, status=status.HTTP_403_FORBIDDEN)

        success, message, payment = verify_payment_with_gateway(order_id)
        if not payment:
            return Response({'error': message}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': success,
            'message': message,
            'payment': PaymentSerializer(payment).data,
            'team_status': payment.team.registration_status,
            'whatsapp_group_link': settings.WHATSAPP_GROUP_LINK if (success and settings.WHATSAPP_GROUP_LINK) else None,
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class SimulatePaymentView(APIView):
    """
    Allows simulating a successful payment ONLY when Razorpay is not in LIVE mode.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if is_razorpay_live():
            return Response(
                {'error': 'Payment simulation is disabled in LIVE mode.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        payment_obj = Payment.objects.select_related('team').filter(order_id=order_id).first()
        if not payment_obj:
            return Response({'error': 'Payment order not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _user_can_access_team(request.user, payment_obj.team):
            return Response({'error': 'You are not authorized to access this order.'}, status=status.HTTP_403_FORBIDDEN)

        success, message = simulate_sandbox_payment(order_id)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(order_id=order_id)
            return Response({
                'success': True,
                'message': message,
                'payment': PaymentSerializer(payment).data,
                'team_status': payment.team.registration_status,
                'whatsapp_group_link': settings.WHATSAPP_GROUP_LINK or None,
            }, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)


class RazorpayWebhookView(APIView):
    """
    Receives Razorpay server-to-server payment confirmation webhooks.
    Verifies X-Razorpay-Signature and idempotently confirms team registration.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        signature = request.headers.get('X-Razorpay-Signature') or request.headers.get('x-razorpay-signature')
        raw_body = request.body

        # Enforce webhook signature verification whenever secret is configured
        if settings.RAZORPAY_WEBHOOK_SECRET:
            if not verify_razorpay_webhook_signature(raw_body, signature):
                logger.warning("Rejected Razorpay webhook due to invalid signature")
                return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except Exception:
            return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

        event = payload.get('event')
        payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
        order_entity = payload.get('payload', {}).get('order', {}).get('entity', {})

        order_id = payment_entity.get('order_id') or order_entity.get('id')
        if not order_id:
            return Response({'status': 'ignored', 'reason': 'No order_id in payload'}, status=status.HTTP_200_OK)

        if event in ('payment.captured', 'order.paid'):
            verify_payment_with_gateway(order_id)

        return Response({'status': 'received'}, status=status.HTTP_200_OK)


class AdminPaymentListView(APIView):
    """
    Admin endpoint to view all payments and filter by status.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request):
        queryset = Payment.objects.select_related('team').order_by('-created_at')

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(payment_status=status_param.upper())

        search_param = request.query_params.get('search')
        if search_param:
            q = search_param.strip()
            queryset = queryset.filter(
                Q(order_id__icontains=q) |
                Q(payment_reference__icontains=q) |
                Q(team__team_name__icontains=q) |
                Q(team__registration_id__icontains=q)
            )

        serializer = PaymentSerializer(queryset, many=True)
        return Response({'count': queryset.count(), 'payments': serializer.data})
