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
    code = serializers.CharField(max_length=64, required=False)
    token = serializers.CharField(max_length=64, required=False)
    email = serializers.EmailField(required=True)

    def validate(self, attrs):
        code_str = (attrs.get('code') or attrs.get('token') or '').strip()
        email_str = (attrs.get('email') or '').strip().lower()

        if not email_str:
            raise serializers.ValidationError({"email": "Email address is required for verification."})

        if not code_str:
            raise serializers.ValidationError({"code": "Please enter your 4-digit verification code."})

        # Strictly enforce both the 4-digit code AND the specific user's email
        queryset = EmailVerificationToken.objects.select_related('user').filter(
            token=code_str,
            user__email=email_str,
            is_used=False
        )

        token_obj = queryset.order_by('-created_at').first()

        if not token_obj:
            check_qs = EmailVerificationToken.objects.filter(token=code_str, user__email=email_str)
            any_token = check_qs.order_by('-created_at').first()
            if any_token:
                if any_token.is_used:
                    raise serializers.ValidationError({"code": "This verification code has already been used."})
                if timezone.now() > any_token.expires_at:
                    raise serializers.ValidationError({"code": "This verification code has expired. Please request a new code."})
            raise serializers.ValidationError({"code": "Invalid verification code for this email. Please check your email and try again."})

        if timezone.now() > token_obj.expires_at:
            raise serializers.ValidationError({"code": "This verification code has expired. Please request a new code."})

        attrs['token_obj'] = token_obj
        return attrs


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
