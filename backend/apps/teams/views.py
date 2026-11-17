from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from apps.accounts.permissions import IsAdminUserRole
from apps.teams.models import Team, TeamMember
from apps.teams.serializers import (
    TeamCreateSerializer,
    TeamDetailSerializer
)


class MyTeamView(APIView):
    """
    Retrieves the team that the logged-in student belongs to (as Leader or Member).
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        # Find team where user is leader or member (by user FK or email match)
        membership = TeamMember.objects.filter(
            Q(user=user) | Q(email=user.email.lower())
        ).exclude(team__registration_status='CANCELLED').select_related('team').first()

        if not membership:
            # Check if user leads a team
            team = Team.objects.filter(team_leader=user).exclude(registration_status='CANCELLED').first()
            if not team:
                return Response({'team': None}, status=status.HTTP_200_OK)
        else:
            team = membership.team

        # Ensure user FK is linked if member2 registers afterwards
        TeamMember.objects.filter(email=user.email.lower(), user__isnull=True).update(user=user)

        serializer = TeamDetailSerializer(team)
        return Response({'team': serializer.data}, status=status.HTTP_200_OK)


class TeamRegisterView(APIView):
    """
    Registers a new team of exactly 2 members.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = TeamCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        team = serializer.save()
        return Response({
            'message': 'Team registered successfully! Please proceed to payment to confirm your registration.',
            'team': TeamDetailSerializer(team).data
        }, status=status.HTTP_201_CREATED)


class AdminTeamListView(APIView):
    """
    Admin endpoint to list all teams with search, filtering, and member details.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request):
        queryset = Team.objects.all().prefetch_related('members', 'payments', 'ticket').order_by('-created_at')

        # Filter by payment_status
        payment_status = request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status.upper())

        # Filter by attendance_status
        attendance_status = request.query_params.get('attendance_status')
        if attendance_status:
            queryset = queryset.filter(attendance_status=attendance_status.upper())

        # Filter by registration_status
        registration_status = request.query_params.get('registration_status')
        if registration_status:
            queryset = queryset.filter(registration_status=registration_status.upper())

        # Search by team name, registration ID, college, member name, email or phone
        search_query = request.query_params.get('search')
        if search_query:
            q = search_query.strip()
            queryset = queryset.filter(
                Q(team_name__icontains=q) |
                Q(registration_id__icontains=q) |
                Q(college_name__icontains=q) |
                Q(members__full_name__icontains=q) |
                Q(members__email__icontains=q) |
                Q(members__mobile_number__icontains=q)
            ).distinct()

        serializer = TeamDetailSerializer(queryset, many=True)
        return Response({'count': queryset.count(), 'teams': serializer.data})


class AdminTeamDetailView(APIView):
    """
    Admin endpoint to view or manage a specific team.
    """
    permission_classes = (IsAdminUserRole,)

    def get(self, request, pk):
        try:
            team = Team.objects.prefetch_related('members', 'payments', 'ticket', 'attendance_logs').get(pk=pk)
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(TeamDetailSerializer(team).data)
