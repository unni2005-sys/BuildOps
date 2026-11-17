from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    StudentRegisterView,
    VerifyEmailView,
    ResendVerificationView,
    LoginView,
    UserProfileView
)

urlpatterns = [
    path('register/', StudentRegisterView.as_view(), name='account-register'),
    path('verify-email/', VerifyEmailView.as_view(), name='account-verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='account-resend-verification'),
    path('login/', LoginView.as_view(), name='account-login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', UserProfileView.as_view(), name='account-profile'),
]
