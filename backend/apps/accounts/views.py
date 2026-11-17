import logging
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.utils import timezone
from apps.accounts.models import User, EmailVerificationToken
from apps.accounts.serializers import (
    UserSerializer,
    StudentRegisterSerializer,
    EmailVerificationSerializer,
    ResendVerificationSerializer,
    LoginSerializer
)
from apps.notifications.services import send_verification_email

logger = logging.getLogger(__name__)


class StudentRegisterView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = StudentRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        token_obj = EmailVerificationToken.generate_token(user)
        send_verification_email(user, token_obj.token)

        response_data = {
            'message': 'Registration successful! Please check your email to verify your account.',
            'email': user.email,
        }
        # Include token in response in debug mode to make automated and local testing effortless
        if settings.DEBUG:
            response_data['dev_verification_token'] = token_obj.token

        return Response(response_data, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_obj = serializer.validated_data['token']
        user = token_obj.user

        user.is_verified = True
        user.save(update_fields=['is_verified'])

        token_obj.is_used = True
        token_obj.save(update_fields=['is_used'])

        # Auto-generate login tokens so the student can immediately proceed
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Email verified successfully! You can now access your account.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['email']
        # Invalidate old unused tokens
        EmailVerificationToken.objects.filter(user=user, is_used=False).update(is_used=True)
        token_obj = EmailVerificationToken.generate_token(user)
        send_verification_email(user, token_obj.token)

        response_data = {
            'message': 'A new verification email has been sent.'
        }
        if settings.DEBUG:
            response_data['dev_verification_token'] = token_obj.token

        return Response(response_data, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']

        # Enforce email verification for students
        if user.role == 'STUDENT' and not user.is_verified:
            return Response({
                'error': 'Your email has not been verified yet. Please verify your email before logging in.',
                'unverified': True,
                'email': user.email
            }, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)
