import re
from rest_framework import serializers
from django.db import transaction
from django.conf import settings
from apps.accounts.models import User
from apps.teams.models import Team, TeamMember


class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMember
        fields = ('id', 'full_name', 'email', 'mobile_number', 'member_role')


class TeamDetailSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    ticket_id = serializers.SerializerMethodField()
    qr_token = serializers.SerializerMethodField()
    has_ticket = serializers.SerializerMethodField()
    fee_amount = serializers.SerializerMethodField()
    event_venue = serializers.SerializerMethodField()
    whatsapp_group_link = serializers.SerializerMethodField()
    payment_proof = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = (
            'id',
            'registration_id',
            'team_name',
            'college_name',
            'payment_status',
            'registration_status',
            'attendance_status',
            'created_at',
            'arrival_timestamp',
            'members',
            'ticket_id',
            'qr_token',
            'has_ticket',
            'fee_amount',
            'event_venue',
            'whatsapp_group_link',
            'payment_proof',
        )

    def get_ticket_id(self, obj):
        if hasattr(obj, 'ticket') and obj.ticket:
            return obj.ticket.id
        if obj.payment_status == 'SUCCESS':
            from apps.tickets.services import generate_ticket_for_team
            ticket = generate_ticket_for_team(obj, send_email=False)
            return ticket.id
        return None

    def get_qr_token(self, obj):
        if hasattr(obj, 'ticket') and obj.ticket:
            return obj.ticket.qr_token
        if obj.payment_status == 'SUCCESS':
            from apps.tickets.services import generate_ticket_for_team
            ticket = generate_ticket_for_team(obj, send_email=False)
            return ticket.qr_token
        return None

    def get_has_ticket(self, obj):
        if hasattr(obj, 'ticket') and obj.ticket is not None:
            return True
        return obj.payment_status == 'SUCCESS'

    def get_fee_amount(self, obj):
        return settings.REGISTRATION_FEE_INR

    def get_event_venue(self, obj):
        return settings.EVENT_VENUE

    def get_whatsapp_group_link(self, obj):
        # Strictly gated: only reveal WhatsApp group invite link after payment is confirmed
        if obj.payment_status == 'SUCCESS' and settings.WHATSAPP_GROUP_LINK:
            return settings.WHATSAPP_GROUP_LINK
        return None

    def get_payment_proof(self, obj):
        latest = obj.payments.order_by('-created_at').first()
        if not latest:
            return None
        request = self.context.get('request')
        screenshot_url = None
        if latest.screenshot:
            screenshot_url = request.build_absolute_uri(latest.screenshot.url) if request else latest.screenshot.url
        return {
            'id': latest.id,
            'order_id': latest.order_id,
            'payment_reference': latest.payment_reference,
            'amount': float(latest.amount),
            'payment_status': latest.payment_status,
            'screenshot_url': screenshot_url,
            'rejection_reason': latest.rejection_reason,
            'payment_timestamp': latest.payment_timestamp,
            'created_at': latest.created_at,
        }


class TeamCreateSerializer(serializers.Serializer):
    team_name = serializers.CharField(max_length=120)
    college_name = serializers.CharField(max_length=200)
    leader_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    member2_name = serializers.CharField(max_length=150)
    member2_email = serializers.EmailField()
    member2_phone = serializers.CharField(max_length=20)

    def validate(self, attrs):
        user = self.context['request'].user
        leader_email = user.email.strip().lower()
        member2_email = attrs['member2_email'].strip().lower()

        raw_leader_phone = attrs.get('leader_phone') or getattr(user, 'mobile_number', '') or ''
        leader_phone = re.sub(r'[\s\-]+', '', raw_leader_phone.strip())
        member2_phone = re.sub(r'[\s\-]+', '', attrs['member2_phone'].strip())

        if not re.fullmatch(r'\d{10}', leader_phone):
            raise serializers.ValidationError("Team Leader mobile number must be a valid 10-digit number.")

        if not re.fullmatch(r'\d{10}', member2_phone):
            raise serializers.ValidationError("Member 2 mobile number must be a valid 10-digit number.")

        # Enforce distinct participants
        if leader_email == member2_email:
            raise serializers.ValidationError("Member 2 email must be different from Team Leader email.")

        if leader_phone == member2_phone:
            raise serializers.ValidationError("Member 2 mobile number must be different from Team Leader mobile number.")

        # Check if the leader already belongs to or leads an active team
        existing_leader_team = TeamMember.objects.filter(email=leader_email).exclude(team__registration_status='CANCELLED').first()
        if existing_leader_team:
            raise serializers.ValidationError(f"You ({leader_email}) are already registered in team '{existing_leader_team.team.team_name}'.")

        # Check if leader phone is already registered in another active team
        existing_phone = TeamMember.objects.filter(mobile_number=leader_phone).exclude(team__registration_status='CANCELLED').first()
        if existing_phone:
            raise serializers.ValidationError(f"Mobile number {leader_phone} is already registered in team '{existing_phone.team.team_name}'.")

        # Check if Member 2 email is already registered in another active team
        existing_member_email = TeamMember.objects.filter(email=member2_email).exclude(team__registration_status='CANCELLED').first()
        if existing_member_email:
            raise serializers.ValidationError(f"Member 2 ({member2_email}) is already registered in team '{existing_member_email.team.team_name}'.")

        # Check if Member 2 phone is already registered in another active team
        existing_member_phone = TeamMember.objects.filter(mobile_number=member2_phone).exclude(team__registration_status='CANCELLED').first()
        if existing_member_phone:
            raise serializers.ValidationError(f"Mobile number {member2_phone} is already registered in team '{existing_member_phone.team.team_name}'.")

        attrs['member2_email'] = member2_email
        attrs['leader_phone'] = leader_phone
        attrs['member2_phone'] = member2_phone
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        if not user.mobile_number:
            user.mobile_number = validated_data['leader_phone']
            user.save(update_fields=['mobile_number'])
        
        team = Team.objects.create(
            team_name=validated_data['team_name'].strip(),
            college_name=validated_data['college_name'].strip(),
            team_leader=user,
            payment_status='PENDING',
            registration_status='PENDING',
            attendance_status='NOT_ARRIVED'
        )

        # Create Leader Member (Exactly 2 members per team)
        TeamMember.objects.create(
            team=team,
            user=user,
            full_name=user.full_name,
            email=user.email.lower(),
            mobile_number=validated_data['leader_phone'],
            member_role='LEADER'
        )

        # Look up if member 2 has an existing user account
        member2_user = User.objects.filter(email=validated_data['member2_email']).first()

        # Create Member 2
        TeamMember.objects.create(
            team=team,
            user=member2_user,
            full_name=validated_data['member2_name'].strip(),
            email=validated_data['member2_email'],
            mobile_number=validated_data['member2_phone'],
            member_role='MEMBER'
        )

        return team
