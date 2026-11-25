from rest_framework import serializers
from apps.payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.team_name', read_only=True)
    registration_id = serializers.CharField(source='team.registration_id', read_only=True)
    screenshot_url = serializers.SerializerMethodField()
    verified_by_email = serializers.EmailField(source='verified_by.email', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id',
            'order_id',
            'team_id',
            'team_name',
            'registration_id',
            'payment_reference',
            'payment_session_id',
            'amount',
            'currency',
            'payment_status',
            'payment_timestamp',
            'screenshot',
            'screenshot_url',
            'rejection_reason',
            'verified_by_email',
            'verified_at',
            'created_at',
            'gateway_response',
        )

    def get_screenshot_url(self, obj):
        has_screenshot = bool(obj.screenshot) or bool(obj.gateway_response.get('screenshot_data_uri'))
        if not has_screenshot:
            return None
        proof_endpoint = f"/api/payments/proof/{obj.id}/"
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(proof_endpoint)
        backend_base = getattr(settings, 'BACKEND_URL', '').rstrip('/')
        return f"{backend_base}{proof_endpoint}" if backend_base else proof_endpoint
