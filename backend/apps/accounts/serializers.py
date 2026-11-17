import re
from rest_framework import serializers
from django.db import models
from django.contrib.auth import authenticate
from django.utils import timezone
from apps.accounts.models import User, EmailVerificationToken


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'mobile_number', 'role', 'is_verified', 'is_admin', 'created_at')
        read_only_fields = ('id', 'role', 'is_verified', 'is_admin', 'created_at')


class AdminUserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)
    team_info = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'mobile_number', 'role', 'is_verified', 'is_active', 'is_admin', 'created_at', 'team_info')

    def get_team_info(self, obj):
        from apps.teams.models import TeamMember, Team
        # Check if user leads a team
        led_team = Team.objects.filter(team_leader=obj).exclude(registration_status='CANCELLED').first()
        if led_team:
            return {
                'id': led_team.id,
                'team_name': led_team.team_name,
                'registration_id': led_team.registration_id,
                'role': 'LEADER',
                'payment_status': led_team.payment_status
            }
        # Check if user is a member of any team
        member = TeamMember.objects.filter(
            models.Q(user=obj) | models.Q(email=obj.email.lower())
        ).exclude(team__registration_status='CANCELLED').select_related('team').first()
        if member:
            return {
                'id': member.team.id,
                'team_name': member.team.team_name,
                'registration_id': member.team.registration_id,
                'role': member.member_role,
                'payment_status': member.team.payment_status
            }
        return None


class StudentRegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    mobile_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate_mobile_number(self, value):
        cleaned = re.sub(r'[\s\-]+', '', value.strip())
        if not re.fullmatch(r'\d{10}', cleaned):
            raise serializers.ValidationError("Please enter a valid 10-digit mobile number.")
        return cleaned

    def create(self, validated_data):
        # Strict enforcement: Public registration is strictly for STUDENT role, requires email verification
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            mobile_number=validated_data['mobile_number'],
            password=validated_data['password'],
            role='STUDENT',
            is_verified=False
        )
        return user


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)

    def validate_token(self, value):
        token_str = value.strip()
        try:
            token_obj = EmailVerificationToken.objects.select_related('user').get(token=token_str)
        except EmailVerificationToken.DoesNotExist:
            raise serializers.ValidationError("Invalid verification token.")

        if token_obj.is_used:
            raise serializers.ValidationError("This verification token has already been used.")
        if timezone.now() > token_obj.expires_at:
            raise serializers.ValidationError("This verification token has expired.")

        return token_obj


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        normalized = value.strip().lower()
        try:
            user = User.objects.get(email=normalized)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email.")
        if user.is_verified:
            raise serializers.ValidationError("This account is already verified.")
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs['user'] = user
        return attrs
