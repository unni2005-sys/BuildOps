from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Creates or updates an Admin account in a controlled management process'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Admin email')
        parser.add_argument('--name', type=str, required=True, help='Admin full name')
        parser.add_argument('--password', type=str, required=True, help='Admin password')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        name = options['name'].strip()
        password = options['password']

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': name,
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
                'is_active': True,
            }
        )

        user.full_name = name
        user.role = 'ADMIN'
        user.is_staff = True
        user.is_superuser = True
        user.is_verified = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f"{action} admin account: {user.email}"))
