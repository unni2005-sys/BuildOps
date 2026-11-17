from django.urls import path
from apps.teams.views import (
    MyTeamView,
    TeamRegisterView,
    AdminTeamListView,
    AdminTeamDetailView
)
from apps.teams.admin_views import (
    AdminDashboardStatsView,
    ExportTeamsCSVView,
    ExportParticipantsCSVView,
    ExportPaymentsCSVView,
    ExportAttendanceCSVView
)

urlpatterns = [
    path('my-team/', MyTeamView.as_view(), name='team-my-team'),
    path('register/', TeamRegisterView.as_view(), name='team-register'),
    path('admin/all/', AdminTeamListView.as_view(), name='admin-team-list'),
    path('admin/<int:pk>/', AdminTeamDetailView.as_view(), name='admin-team-detail'),
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('admin/reports/teams-csv/', ExportTeamsCSVView.as_view(), name='admin-export-teams'),
    path('admin/reports/participants-csv/', ExportParticipantsCSVView.as_view(), name='admin-export-participants'),
    path('admin/reports/payments-csv/', ExportPaymentsCSVView.as_view(), name='admin-export-payments'),
    path('admin/reports/attendance-csv/', ExportAttendanceCSVView.as_view(), name='admin-export-attendance'),
]
