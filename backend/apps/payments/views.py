import logging
from django.http import HttpResponse
from django.conf import settings
from django.db.models import Q
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import Team, TeamMember
from apps.teams.serializers import TeamDetailSerializer
from apps.payments.models import Payment
from apps.payments.serializers import PaymentSerializer
from apps.payments.services import (
    get_upi_details,
    generate_upi_qr_code_png,
    record_payment_proof,
    approve_payment,
    reject_payment,
)

logger = logging.getLogger(__name__)


def _get_user_team(user):
    member = TeamMember.objects.filter(
        Q(user=user) | Q(email=user.email.lower())
    ).exclude(team__registration_status='CANCELLED').select_related('team').first()

    if member:
        return member.team
    return Team.objects.filter(team_leader=user).exclude(registration_status='CANCELLED').first()


class UPIDetailsView(APIView):
    """
    Returns configured UPI payment details, amount, payee name, and dynamic deep-link URI.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        team = _get_user_team(request.user)
        details = get_upi_details(team)
        return Response({
            'success': True,
            **details,
            'team': {
                'id': team.id if team else None,
                'registration_id': team.registration_id if team else None,
                'team_name': team.team_name if team else None,
                'payment_status': team.payment_status if team else None,
            } if team else None,
        })


class UPIQRCodeView(APIView):
    """
    Returns a dynamically generated PNG QR code image for the team's UPI payment URI.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        reg_id = request.query_params.get('reg_id', '').strip()
        team = None
        if reg_id:
            team = Team.objects.filter(registration_id=reg_id).first()
        elif request.user and request.user.is_authenticated:
            team = _get_user_team(request.user)

        png_bytes = generate_upi_qr_code_png(team)
        return HttpResponse(png_bytes, content_type='image/png')


class SubmitPaymentProofView(APIView):
    """
    Accepts student's uploaded payment confirmation screenshot and transaction/UTR number.
    Marks team payment_status as VERIFICATION_PENDING.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        team = _get_user_team(request.user)
        if not team:
            return Response(
                {'error': 'You do not have any registered team.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if team.payment_status == 'SUCCESS':
            return Response(
                {'error': 'This team has already completed payment and is confirmed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        screenshot = request.FILES.get('screenshot')
        if not screenshot:
            return Response(
                {'error': 'Please upload a screenshot of your completed UPI transaction.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 8MB)
        if screenshot.size > 8 * 1024 * 1024:
            return Response(
                {'error': 'File size exceeds 8MB. Please upload a smaller image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        transaction_id = request.data.get('transaction_id', '').strip()
        if not transaction_id:
            transaction_id = request.data.get('payment_reference', '').strip()

        detection_type = request.data.get('detection_type', '').strip()
        gateway_meta = {}
        if detection_type:
            gateway_meta['detection_type'] = detection_type
            gateway_meta['auto_fetched'] = True

        try:
            payment = record_payment_proof(
                team,
                screenshot,
                transaction_id=transaction_id,
                gateway_meta=gateway_meta,
            )
            return Response({
                'success': True,
                'message': 'Payment proof submitted successfully! Verification is pending.',
                'payment': PaymentSerializer(payment, context={'request': request}).data,
                'team': TeamDetailSerializer(team, context={'request': request}).data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error saving payment proof")
            return Response(
                {'error': f'Failed to upload payment proof: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminApprovePaymentView(APIView):
    """
    Admin endpoint to approve a team's payment proof.
    Marks payment and team SUCCESS/CONFIRMED, and dispatches gate pass tickets + WhatsApp link.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request, team_id):
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'Team not found.'}, status=status.HTTP_404_NOT_FOUND)

        payment = approve_payment(team, admin_user=request.user)
        return Response({
            'success': True,
            'message': f"Payment for team '{team.team_name}' approved successfully! Tickets and WhatsApp link dispatched.",
            'payment': PaymentSerializer(payment, context={'request': request}).data,
            'team': TeamDetailSerializer(team, context={'request': request}).data,
        }, status=status.HTTP_200_OK)


class AdminRejectPaymentView(APIView):
    """
    Admin endpoint to reject a team's payment proof with an optional reason.
    Allows the student to re-upload.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request, team_id):
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'Team not found.'}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', '').strip()
        payment = reject_payment(team, reason=reason)
        return Response({
            'success': True,
            'message': f"Payment for team '{team.team_name}' marked as rejected.",
            'payment': PaymentSerializer(payment, context={'request': request}).data,
            'team': TeamDetailSerializer(team, context={'request': request}).data,
        }, status=status.HTTP_200_OK)


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

        serializer = PaymentSerializer(queryset, many=True, context={'request': request})
        return Response({'count': queryset.count(), 'payments': serializer.data})
