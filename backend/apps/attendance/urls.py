from django.urls import path
from apps.attendance.views import (
    ValidateTokenView,
    CheckInView,
    AttendanceLogsListView
)

urlpatterns = [
    path('validate/', ValidateTokenView.as_view(), name='attendance-validate'),
    path('check-in/', CheckInView.as_view(), name='attendance-check-in'),
    path('logs/', AttendanceLogsListView.as_view(), name='attendance-logs'),
]
