from django.urls import path
from apps.certificates.views import (
    MyCertificateView,
    DownloadCertificateView,
    AdminRegenerateCertificatesView,
    AdminCertificateListView
)

urlpatterns = [
    path('my-certificate/', MyCertificateView.as_view(), name='certificate-my-cert'),
    path('<int:pk>/download/', DownloadCertificateView.as_view(), name='certificate-download'),
    path('admin/all/', AdminCertificateListView.as_view(), name='admin-certificate-list'),
    path('admin/regenerate/<int:team_id>/', AdminRegenerateCertificatesView.as_view(), name='admin-certificate-regenerate'),
]
