from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.teams.models import Team, TeamMember
from apps.payments.models import Payment
from apps.tickets.services import generate_ticket_for_team
from apps.attendance.services import perform_team_check_in


class Command(BaseCommand):
    help = 'Seeds sample teams, users, payments, tickets, and check-in attendance data for demonstration'

    def handle(self, *args, **options):
        # 1. Ensure Admin exists
        admin, _ = User.objects.get_or_create(
            email='admin@buildathon.org',
            defaults={
                'full_name': 'Chief Admin',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
                'is_active': True
            }
        )
        admin.set_password('Admin@123456')
        admin.save()
        self.stdout.write(self.style.SUCCESS('Admin: admin@buildathon.org / Admin@123456'))

        # 2. Team Alpha (Confirmed, Paid, Not Arrived)
        u1, _ = User.objects.get_or_create(
            email='arjun@alpha.com',
            defaults={'full_name': 'Arjun Mehta', 'role': 'STUDENT', 'is_verified': True}
        )
        u1.set_password('Student@123')
        u1.save()

        u2, _ = User.objects.get_or_create(
            email='sneha@alpha.com',
            defaults={'full_name': 'Sneha Nair', 'role': 'STUDENT', 'is_verified': True}
        )
        u2.set_password('Student@123')
        u2.save()

        team_alpha, created = Team.objects.get_or_create(
            registration_id='BUILD-ALPHA01',
            defaults={
                'team_name': 'Neural Ninjas',
                'college_name': 'Indian Institute of Information Technology',
                'team_leader': u1,
                'payment_status': 'SUCCESS',
                'registration_status': 'CONFIRMED',
                'attendance_status': 'NOT_ARRIVED'
            }
        )
        if created:
            TeamMember.objects.create(team=team_alpha, user=u1, full_name=u1.full_name, email=u1.email, mobile_number='9876500001', member_role='LEADER')
            TeamMember.objects.create(team=team_alpha, user=u2, full_name=u2.full_name, email=u2.email, mobile_number='9876500002', member_role='MEMBER')
            Payment.objects.create(team=team_alpha, order_id='ORDER_ALPHA01', amount=499, currency='INR', payment_status='SUCCESS', payment_reference='CF_REF_ALPHA01', payment_timestamp=timezone.now())
            ticket_alpha = generate_ticket_for_team(team_alpha)
            self.stdout.write(self.style.SUCCESS(f"Created Team Alpha (Paid, Ready to scan). QR Token: {ticket_alpha.qr_token}"))

        # 3. Team Beta (Confirmed, Paid, Already Arrived & Certificates generated)
        u3, _ = User.objects.get_or_create(
            email='vikram@beta.com',
            defaults={'full_name': 'Vikram Patel', 'role': 'STUDENT', 'is_verified': True}
        )
        u3.set_password('Student@123')
        u3.save()

        u4, _ = User.objects.get_or_create(
            email='priya@beta.com',
            defaults={'full_name': 'Priya Rao', 'role': 'STUDENT', 'is_verified': True}
        )
        u4.set_password('Student@123')
        u4.save()

        team_beta, created = Team.objects.get_or_create(
            registration_id='BUILD-BETA02',
            defaults={
                'team_name': 'Cyber Voyagers',
                'college_name': 'National Engineering College',
                'team_leader': u3,
                'payment_status': 'SUCCESS',
                'registration_status': 'CONFIRMED',
                'attendance_status': 'NOT_ARRIVED'
            }
        )
        if created:
            TeamMember.objects.create(team=team_beta, user=u3, full_name=u3.full_name, email=u3.email, mobile_number='9876500003', member_role='LEADER')
            TeamMember.objects.create(team=team_beta, user=u4, full_name=u4.full_name, email=u4.email, mobile_number='9876500004', member_role='MEMBER')
            Payment.objects.create(team=team_beta, order_id='ORDER_BETA02', amount=499, currency='INR', payment_status='SUCCESS', payment_reference='CF_REF_BETA02', payment_timestamp=timezone.now())
            generate_ticket_for_team(team_beta)
            perform_team_check_in(team_beta, admin, action_details='Seed Arrival Check-in')
            self.stdout.write(self.style.SUCCESS("Created Team Beta (Already Arrived with Certificates)"))

        # 4. Team Gamma (Pending Payment)
        u5, _ = User.objects.get_or_create(
            email='kiran@gamma.com',
            defaults={'full_name': 'Kiran Das', 'role': 'STUDENT', 'is_verified': True}
        )
        u5.set_password('Student@123')
        u5.save()

        team_gamma, created = Team.objects.get_or_create(
            registration_id='BUILD-GAMMA03',
            defaults={
                'team_name': 'Algo Architects',
                'college_name': 'City Tech University',
                'team_leader': u5,
                'payment_status': 'PENDING',
                'registration_status': 'PENDING',
                'attendance_status': 'NOT_ARRIVED'
            }
        )
        if created:
            TeamMember.objects.create(team=team_gamma, user=u5, full_name=u5.full_name, email=u5.email, mobile_number='9876500005', member_role='LEADER')
            TeamMember.objects.create(team=team_gamma, user=None, full_name='Tanya Sen', email='tanya@gamma.com', mobile_number='9876500006', member_role='MEMBER')
            self.stdout.write(self.style.SUCCESS("Created Team Gamma (Pending payment)"))

        self.stdout.write(self.style.SUCCESS("Demo database successfully seeded!"))
