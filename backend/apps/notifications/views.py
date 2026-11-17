from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserRole
from apps.notifications.models import EmailLog
from apps.notifications.services import send_email_notification


class AdminEmailLogsView(APIView):
    """
    Lists recent email delivery logs for administrative monitoring.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request):
        logs = EmailLog.objects.order_by('-created_at')[:100]
        data = [{
            'id': l.id,
            'recipient_email': l.recipient_email,
            'email_type': l.email_type,
            'subject': l.subject,
            'status': l.status,
            'error_message': l.error_message,
            'retry_count': l.retry_count,
            'sent_at': l.sent_at,
            'created_at': l.created_at
        } for l in logs]
        return Response({'count': len(data), 'logs': data})


class AdminRetryEmailView(APIView):
    """
    Retries sending an email that previously failed.
    """
    permission_classes = (IsAdminUserRole,)

    def post(self, request, pk):
        try:
            log = EmailLog.objects.get(pk=pk)
        except EmailLog.DoesNotExist:
            return Response({'error': 'Email log not found.'}, status=status.HTTP_404_NOT_FOUND)

        log.retry_count += 1
        log.save(update_fields=['retry_count'])

        # Attempt sending
        success, new_log = send_email_notification(
            recipient_email=log.recipient_email,
            email_type=log.email_type,
            subject=log.subject,
            text_content="Retrying delivery: Please check your portal for complete documents."
        )

        return Response({
            'message': 'Retry attempted.',
            'success': success,
            'status': new_log.status
        }, status=status.HTTP_200_OK)
