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
    create_cashfree_order,
    verify_payment_with_gateway,
    verify_cashfree_signature,
    simulate_sandbox_payment
)

logger = logging.getLogger(__name__)


class CreateOrderView(APIView):
    """
    Creates a Cashfree payment order for the student's pending team.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        # Find user's team
        member = TeamMember.objects.filter(user=user).exclude(team__registration_status='CANCELLED').first()
        if not member:
            # Check led_teams
            team = Team.objects.filter(team_leader=user).exclude(registration_status='CANCELLED').first()
        else:
            team = member.team

        if not team:
            return Response({'error': 'You do not have any registered team.'}, status=status.HTTP_400_BAD_REQUEST)

        if team.payment_status == 'SUCCESS':
            return Response({'error': 'Team has already completed payment.'}, status=status.HTTP_400_BAD_REQUEST)

        return_url = request.data.get('return_url')

        try:
            payment = create_cashfree_order(team, return_url=return_url)
            return Response({
                'order_id': payment.order_id,
                'payment_session_id': payment.payment_session_id,
                'amount': float(payment.amount),
                'currency': payment.currency,
                'environment': settings.CASHFREE_ENV,
                'is_mock': "mock" in str(payment.payment_session_id),
                'team': {
                    'id': team.id,
                    'registration_id': team.registration_id,
                    'team_name': team.team_name,
                }
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    """
    Verifies the payment with Cashfree and confirms registration.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, order_id):
        success, message, payment = verify_payment_with_gateway(order_id)
        if not payment:
            return Response({'error': message}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': success,
            'message': message,
            'payment': PaymentSerializer(payment).data,
            'team_status': payment.team.registration_status,
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class SimulatePaymentView(APIView):
    """
    Allows simulating a successful payment in development/sandbox mode.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if settings.CASHFREE_ENV == 'PRODUCTION':
            return Response(
                {'error': 'Payment simulation is disabled in production mode.'},
                status=status.HTTP_403_FORBIDDEN
            )

        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        success, message = simulate_sandbox_payment(order_id)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(order_id=order_id)
            return Response({
                'success': True,
                'message': message,
                'payment': PaymentSerializer(payment).data,
                'team_status': payment.team.registration_status
            }, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)


class CashfreeWebhookView(APIView):
    """
    Receives Cashfree server-side payment confirmation webhooks.
    Verifies signature and idempotently confirms team registration.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        signature = request.headers.get('x-webhook-signature')
        timestamp = request.headers.get('x-webhook-timestamp')
        raw_body = request.body

        # Verify signature if configured
        if settings.CASHFREE_WEBHOOK_SECRET and signature and timestamp:
            is_valid = verify_cashfree_signature(raw_body, timestamp, signature)
            if not is_valid:
                logger.warning("Rejected webhook due to invalid signature")
                return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except Exception:
            return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get('type')
        data = payload.get('data', {})
        order_info = data.get('order', {})
        payment_info = data.get('payment', {})

        order_id = order_info.get('order_id')
        if not order_id:
            return Response({'error': 'No order_id in webhook'}, status=status.HTTP_400_BAD_REQUEST)

        # Process payment success
        if event_type == 'PAYMENT_SUCCESS_WEBHOOK' or payment_info.get('payment_status') == 'SUCCESS':
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
