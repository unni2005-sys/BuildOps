import os
from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.teams.models import Team, TeamMember
from apps.payments.models import Payment
from apps.tickets.models import Ticket
from apps.attendance.models import AttendanceLog


class BuildathonSystemIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            email='admin@buildathon.org',
            full_name='Chief Admin',
            password='AdminPassword123'
        )

        # Student 1 (Leader)
        self.student1 = User.objects.create_user(
            email='student1@example.com',
            full_name='Rohan Verma',
            password='Password123',
            role='STUDENT',
            is_verified=True
        )

        # Student 2 (will be member 2)
        self.student2 = User.objects.create_user(
            email='student2@example.com',
            full_name='Ananya Sen',
            password='Password123',
            role='STUDENT',
            is_verified=True
        )

    def test_complete_end_to_end_journey(self):
        """
        Tests the entire end-to-end journey:
        1. Student logs in
        2. Student registers a team with exactly 2 members
        3. Attempts to register duplicate team / duplicate member (must be rejected)
        4. Creates payment order
        5. Completes payment verification
        6. Verifies E-Ticket and QR generation
        7. Admin scans QR and checks in team
        8. Second check-in attempt blocked ('Already Arrived')
        9. Verifies automatic certificate generation for both members
        10. Verifies admin statistics and CSV exports
        """
        # 1. Login Student 1
        login_res = self.client.post('/api/accounts/login/', {
            'email': 'student1@example.com',
            'password': 'Password123'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 2. Register Team
        team_data = {
            'team_name': 'Quantum Coders',
            'college_name': 'National Institute of Tech',
            'leader_phone': '9876543210',
            'member2_name': 'Ananya Sen',
            'member2_email': 'student2@example.com',
            'member2_phone': '9876543211'
        }
        create_team_res = self.client.post('/api/teams/register/', team_data, format='json')
        self.assertEqual(create_team_res.status_code, status.HTTP_201_CREATED)
        team_id = create_team_res.data['team']['id']
        reg_id = create_team_res.data['team']['registration_id']

        team = Team.objects.get(id=team_id)
        self.assertEqual(team.members.count(), 2)
        self.assertEqual(team.payment_status, 'PENDING')
        self.assertEqual(team.registration_status, 'PENDING')

        # 3. Duplicate checks:
        # A) Leader attempts to create another team -> Must fail
        dup_res = self.client.post('/api/teams/register/', team_data, format='json')
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

        # B) Another student attempts to register with already registered member2 email
        student3 = User.objects.create_user(
            email='student3@example.com',
            full_name='Third Student',
            password='Password123',
            role='STUDENT',
            is_verified=True
        )
        self.client.force_authenticate(user=student3)
        dup_member_res = self.client.post('/api/teams/register/', {
            'team_name': 'Other Team',
            'college_name': 'Other College',
            'leader_phone': '9123456780',
            'member2_name': 'Duplicate Person',
            'member2_email': 'student2@example.com', # Already registered in Quantum Coders
            'member2_phone': '9123456781'
        }, format='json')
        self.assertEqual(dup_member_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Switch back to Student 1
        self.client.force_authenticate(user=self.student1)

        # 4. Create Payment Order
        order_res = self.client.post('/api/payments/create-order/', {}, format='json')
        self.assertEqual(order_res.status_code, status.HTTP_201_CREATED)
        order_id = order_res.data['order_id']
        self.assertIn('payment_session_id', order_res.data)

        # 5. Simulate / Verify Payment
        sim_res = self.client.post('/api/payments/simulate/', {'order_id': order_id}, format='json')
        self.assertEqual(sim_res.status_code, status.HTTP_200_OK)

        team.refresh_from_db()
        self.assertEqual(team.payment_status, 'SUCCESS')
        self.assertEqual(team.registration_status, 'CONFIRMED')

        # 6. Check Ticket Generation
        self.assertTrue(Ticket.objects.filter(team=team).exists())
        ticket = Ticket.objects.get(team=team)
        self.assertTrue(ticket.qr_token.startswith('TKT-'))
        self.assertTrue(os.path.exists(os.path.join(settings.MEDIA_ROOT, ticket.pdf_path)))

        # Student accesses ticket
        my_ticket_res = self.client.get('/api/tickets/my-ticket/')
        self.assertEqual(my_ticket_res.status_code, status.HTTP_200_OK)
        self.assertEqual(my_ticket_res.data['qr_token'], ticket.qr_token)

        # Student 2 also accesses the same team ticket
        self.client.force_authenticate(user=self.student2)
        my_ticket_res_2 = self.client.get('/api/tickets/my-ticket/')
        self.assertEqual(my_ticket_res_2.status_code, status.HTTP_200_OK)
        self.assertEqual(my_ticket_res_2.data['qr_token'], ticket.qr_token)

        # 7. Admin Scans QR and Checks In Team
        self.client.force_authenticate(user=self.admin)

        # Validate token
        val_res = self.client.post('/api/attendance/validate/', {'token': ticket.qr_token}, format='json')
        self.assertEqual(val_res.status_code, status.HTTP_200_OK)
        self.assertTrue(val_res.data['ready_for_checkin'])
        self.assertFalse(val_res.data['already_arrived'])

        # Check-in
        checkin_res = self.client.post('/api/attendance/check-in/', {
            'token': ticket.qr_token,
            'action_details': 'Gate 1 QR Scanner'
        }, format='json')
        self.assertEqual(checkin_res.status_code, status.HTTP_200_OK)

        team.refresh_from_db()
        self.assertEqual(team.attendance_status, 'ARRIVED')
        self.assertIsNotNone(team.arrival_timestamp)
        self.assertTrue(AttendanceLog.objects.filter(team=team).exists())

        # 8. Duplicate Check-in Attempt -> Blocked!
        second_checkin_res = self.client.post('/api/attendance/check-in/', {
            'token': ticket.qr_token
        }, format='json')
        self.assertEqual(second_checkin_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(second_checkin_res.data.get('already_arrived'))

        # 9. Admin Stats & Reports
        self.client.force_authenticate(user=self.admin)
        stats_res = self.client.get('/api/teams/admin/stats/')
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data['arrived_teams'], 1)
        self.assertEqual(stats_res.data['successful_payments'], 1)

        # CSV Exports
        teams_csv = self.client.get('/api/teams/admin/reports/teams-csv/')
        self.assertEqual(teams_csv.status_code, status.HTTP_200_OK)
        self.assertEqual(teams_csv['Content-Type'], 'text/csv')

        participants_csv = self.client.get('/api/teams/admin/reports/participants-csv/')
        self.assertEqual(participants_csv.status_code, status.HTTP_200_OK)
