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
        # Include token in response in debug mode for seamless local testing
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


class AdminUserListView(APIView):
    """
    Admin endpoint to view and search all registered user accounts.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if not (request.user.role == 'ADMIN' or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin permissions required.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db import models
        from apps.accounts.serializers import AdminUserSerializer

        queryset = User.objects.all().order_by('-created_at')

        role = request.query_params.get('role')
        if role and role.upper() != 'ALL':
            queryset = queryset.filter(role=role.upper())

        search = request.query_params.get('search')
        if search:
            q = search.strip()
            queryset = queryset.filter(
                models.Q(full_name__icontains=q) | models.Q(email__icontains=q)
            )

        serializer = AdminUserSerializer(queryset, many=True)
        return Response({'count': queryset.count(), 'users': serializer.data})


class AdminUserDeleteView(APIView):
    """
    Admin endpoint to permanently delete a user account and all their records from the entire database.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, pk):
        if not (request.user.role == 'ADMIN' or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin permissions required.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db import models, transaction
        from apps.teams.models import TeamMember, Team

        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User account not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Safety check: Cannot delete own logged-in admin account
        if target_user.id == request.user.id:
            return Response({'error': 'You cannot delete your own admin account.'}, status=status.HTTP_400_BAD_REQUEST)

        user_email = target_user.email
        user_name = target_user.full_name

        with transaction.atomic():
            # 1. If user was Member 2 on someone else's team, unlink user FK cleanly
            #    instead of deleting the TeamMember row and leaving an orphaned 1-member team.
            TeamMember.objects.filter(
                models.Q(user=target_user) | models.Q(email=user_email.lower())
            ).exclude(team__team_leader=target_user).update(user=None)

            # 2. Delete verification tokens
            EmailVerificationToken.objects.filter(user=target_user).delete()

            # 3. Permanently delete the user account (cascades to led teams, payments, tickets)
            target_user.delete()

        logger.info(f"Admin {request.user.email} permanently deleted user {user_email} (ID: {pk})")
        return Response({
            'message': f'User account "{user_name}" ({user_email}) has been permanently deleted from the database.',
            'deleted_user_id': pk
        }, status=status.HTTP_200_OK)
