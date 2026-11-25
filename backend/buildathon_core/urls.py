from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok', 'event': settings.EVENT_NAME})


urlpatterns = [
    path('api/health/', health_check, name='api-health'),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/teams/', include('apps.teams.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/tickets/', include('apps.tickets.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
