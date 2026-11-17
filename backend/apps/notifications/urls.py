from django.urls import path
from apps.notifications.views import AdminEmailLogsView, AdminRetryEmailView

urlpatterns = [
    path('admin/logs/', AdminEmailLogsView.as_view(), name='admin-email-logs'),
    path('admin/retry/<int:pk>/', AdminRetryEmailView.as_view(), name='admin-email-retry'),
]
