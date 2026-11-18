from django.urls import path
from apps.payments.views import (
    CreateOrderView,
    VerifyRazorpayPaymentView,
    VerifyPaymentView,
    SimulatePaymentView,
    RazorpayWebhookView,
    AdminPaymentListView
)

urlpatterns = [
    path('create-order/', CreateOrderView.as_view(), name='payment-create-order'),
    path('verify-razorpay/', VerifyRazorpayPaymentView.as_view(), name='payment-verify-razorpay'),
    path('verify/<str:order_id>/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('simulate/', SimulatePaymentView.as_view(), name='payment-simulate'),
    path('webhook/', RazorpayWebhookView.as_view(), name='payment-webhook'),
    path('admin/all/', AdminPaymentListView.as_view(), name='admin-payment-list'),
]
