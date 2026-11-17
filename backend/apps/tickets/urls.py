from django.urls import path
from apps.tickets.views import (
    MyTicketView,
    DownloadTicketView,
    AdminResendTicketEmailView
)

urlpatterns = [
    path('my-ticket/', MyTicketView.as_view(), name='ticket-my-ticket'),
    path('<int:pk>/download/', DownloadTicketView.as_view(), name='ticket-download'),
    path('admin/<int:pk>/resend-email/', AdminResendTicketEmailView.as_view(), name='admin-ticket-resend-email'),
]
