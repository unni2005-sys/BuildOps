from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from apps.accounts.models import User, EmailVerificationToken


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'role', 'is_verified', 'is_admin', 'created_at')
        read_only_fields = ('id', 'role', 'is_verified', 'is_admin', 'created_at')


class StudentRegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def create(self, validated_data):
        # Strict enforcement: Public registration is strictly for STUDENT role, requires email verification
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
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
