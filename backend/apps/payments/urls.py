from django.urls import path
from apps.payments.views import (
    CreateOrderView,
    VerifyPaymentView,
    SimulatePaymentView,
    CashfreeWebhookView,
    AdminPaymentListView
)

urlpatterns = [
    path('create-order/', CreateOrderView.as_view(), name='payment-create-order'),
    path('verify/<str:order_id>/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('simulate/', SimulatePaymentView.as_view(), name='payment-simulate'),
    path('webhook/', CashfreeWebhookView.as_view(), name='payment-webhook'),
    path('admin/all/', AdminPaymentListView.as_view(), name='admin-payment-list'),
]
