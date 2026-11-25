import io
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.teams.models import Team, TeamMember
from apps.teams.serializers import TeamDetailSerializer
from apps.payments.models import Payment


class PaymentProofAmountDetectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='leader@testbuildops.org',
            full_name='Leader Student',
            password='Password123',
            role='STUDENT',
            is_verified=True,
            mobile_number='9876543210',
        )
        self.team = Team.objects.create(
            team_leader=self.user,
            team_name='Alpha Builders',
            college_name='Tech Institute',
            registration_id='BUILD-123456',
            payment_status='UNPAID',
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.user,
            full_name='Leader Student',
            email='leader@testbuildops.org',
            mobile_number='9876543210',
            member_role='LEADER',
        )
        self.client.force_authenticate(user=self.user)

    def _create_dummy_image(self):
        image = Image.new('RGB', (100, 100), color=(73, 109, 137))
        byte_arr = io.BytesIO()
        image.save(byte_arr, format='PNG')
        return SimpleUploadedFile("screenshot.png", byte_arr.getvalue(), content_type="image/png")

    def test_submit_proof_with_exact_detected_amount(self):
        img = self._create_dummy_image()
        res = self.client.post('/api/payments/submit-proof/', {
            'screenshot': img,
            'transaction_id': '432109876543',
            'detection_type': 'UPI UTR / Ref No',
            'detected_amount': 500.0,
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.team.refresh_from_db()
        self.assertEqual(self.team.payment_status, 'VERIFICATION_PENDING')

        payment = self.team.payments.latest('created_at')
        self.assertEqual(payment.payment_reference, '432109876543')
        self.assertEqual(payment.gateway_response.get('detected_amount'), 500.0)
        self.assertTrue(payment.gateway_response.get('auto_fetched'))

        # Check serializer exposure
        data = TeamDetailSerializer(self.team).data
        self.assertEqual(data['payment_proof']['detected_amount'], 500.0)
        self.assertEqual(data['payment_proof']['payment_reference'], '432109876543')

    def test_submit_proof_with_underpaid_detected_amount(self):
        img = self._create_dummy_image()
        res = self.client.post('/api/payments/submit-proof/', {
            'screenshot': img,
            'transaction_id': '111122223333',
            'detection_type': 'UPI UTR / Ref No',
            'detected_amount': 250.0,
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        payment = self.team.payments.latest('created_at')
        self.assertEqual(payment.gateway_response.get('detected_amount'), 250.0)

        data = TeamDetailSerializer(self.team).data
        self.assertEqual(data['payment_proof']['detected_amount'], 250.0)
