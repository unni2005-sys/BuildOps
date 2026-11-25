from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, EmailVerificationToken


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_student_registration_and_verification_flow(self):
        # 1. Register student
        reg_data = {
            'full_name': 'Aarav Sharma',
            'email': 'aarav@example.com',
            'mobile_number': '9876543210',
            'password': 'SecurePassword123'
        }
        res = self.client.post('/api/accounts/register/', reg_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='aarav@example.com').exists())

        user = User.objects.get(email='aarav@example.com')
        self.assertEqual(user.role, 'STUDENT')
        self.assertFalse(user.is_verified)

        # 2. Try logging in before verification -> should fail with 403
        login_res = self.client.post('/api/accounts/login/', {
            'email': 'aarav@example.com',
            'password': 'SecurePassword123'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(login_res.data.get('unverified'))

        # 3. Verify email with token
        token_obj = EmailVerificationToken.objects.get(user=user)

        # 3a. Verification without email must fail (closes account takeover loophole)
        bad_res = self.client.post('/api/accounts/verify-email/', {
            'code': token_obj.token
        }, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3b. Verification with correct code and email succeeds
        verify_res = self.client.post('/api/accounts/verify-email/', {
            'code': token_obj.token,
            'email': user.email
        }, format='json')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', verify_res.data)

        user.refresh_from_db()
        self.assertTrue(user.is_verified)

        # 4. Login after verification -> should succeed
        login_res = self.client.post('/api/accounts/login/', {
            'email': 'aarav@example.com',
            'password': 'SecurePassword123'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    def test_public_cannot_register_as_admin(self):
        # Attempting to register as admin via public API
        reg_data = {
            'full_name': 'Hacker Admin',
            'email': 'hacker@example.com',
            'mobile_number': '9876543210',
            'password': 'SecurePassword123',
            'role': 'ADMIN'
        }
        res = self.client.post('/api/accounts/register/', reg_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='hacker@example.com')
        self.assertEqual(user.role, 'STUDENT', "Public registration must never assign ADMIN role")
