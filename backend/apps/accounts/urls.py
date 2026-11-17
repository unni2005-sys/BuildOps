from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    StudentRegisterView,
    VerifyEmailView,
    ResendVerificationView,
    LoginView,
    UserProfileView,
    AdminUserListView,
    AdminUserDeleteView
)

urlpatterns = [
    path('register/', StudentRegisterView.as_view(), name='account-register'),
    path('verify-email/', VerifyEmailView.as_view(), name='account-verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='account-resend-verification'),
    path('login/', LoginView.as_view(), name='account-login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', UserProfileView.as_view(), name='account-profile'),
    
    # Admin User Management
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDeleteView.as_view(), name='admin-user-delete'),
]
