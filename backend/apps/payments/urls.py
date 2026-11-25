from django.urls import path
from apps.payments.views import (
    UPIDetailsView,
    UPIQRCodeView,
    SubmitPaymentProofView,
    AdminApprovePaymentView,
    AdminRejectPaymentView,
    AdminPaymentListView,
)

urlpatterns = [
    path('upi-details/', UPIDetailsView.as_view(), name='payment-upi-details'),
    path('upi-qr/', UPIQRCodeView.as_view(), name='payment-upi-qr'),
    path('submit-proof/', SubmitPaymentProofView.as_view(), name='payment-submit-proof'),
    path('admin/approve/<int:team_id>/', AdminApprovePaymentView.as_view(), name='admin-payment-approve'),
    path('admin/reject/<int:team_id>/', AdminRejectPaymentView.as_view(), name='admin-payment-reject'),
    path('admin/all/', AdminPaymentListView.as_view(), name='admin-payment-list'),
]
