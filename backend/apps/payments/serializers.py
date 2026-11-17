from rest_framework import serializers
from apps.payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.team_name', read_only=True)
    registration_id = serializers.CharField(source='team.registration_id', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id',
            'order_id',
            'team_name',
            'registration_id',
            'payment_reference',
            'payment_session_id',
            'amount',
            'currency',
            'payment_status',
            'payment_timestamp',
            'created_at',
            'gateway_response',
        )
