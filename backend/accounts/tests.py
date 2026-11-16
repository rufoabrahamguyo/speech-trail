from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User

GOOGLE_IDINFO = {
    "sub": "google-sub-1",
    "email": "ada@example.com",
    "email_verified": True,
    "name": "Ada Lovelace",
    "iss": "https://accounts.google.com",
}


@override_settings(GOOGLE_CLIENT_ID="test-client.apps.googleusercontent.com")
class GoogleLoginTests(APITestCase):
    def post(self, credential="token"):
        return self.client.post("/api/auth/google/", {"credential": credential}, format="json")

    @patch("accounts.views.verify_google_id_token", return_value=GOOGLE_IDINFO)
    def test_new_google_user_gets_a_session(self, _verify):
        response = self.post()
        self.assertEqual(response.status_code, 200, response.content)
        user = User.objects.get(email="ada@example.com")
        self.assertEqual(user.name, "Ada Lovelace")
        self.assertEqual(user.google_sub, "google-sub-1")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(response.data["user"]["email"], "ada@example.com")
        self.assertTrue(response.data["access"])

    @patch("accounts.views.verify_google_id_token", return_value=GOOGLE_IDINFO)
    def test_existing_email_is_linked(self, _verify):
        User.objects.create_user(email="ada@example.com", name="Ada", password="speak-well-1")
        response = self.post()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().google_sub, "google-sub-1")

    @patch("accounts.views.verify_google_id_token", return_value=GOOGLE_IDINFO)
    def test_returning_google_user_logs_in(self, _verify):
        user = User(email="ada@example.com", name="Ada", google_sub="google-sub-1")
        user.set_unusable_password()
        user.save()
        response = self.post()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["user"]["id"], str(user.id))

    @patch("accounts.views.verify_google_id_token", return_value=GOOGLE_IDINFO)
    def test_email_linked_to_another_google_account_is_rejected(self, _verify):
        User.objects.create_user(email="ada@example.com", name="Ada", password="speak-well-1", google_sub="other-sub")
        response = self.post()
        self.assertEqual(response.status_code, 409, response.content)

    def test_missing_client_id_is_unavailable(self):
        with override_settings(GOOGLE_CLIENT_ID=""):
            response = self.post()
        self.assertEqual(response.status_code, 503, response.content)

    def test_config_returns_the_client_id(self):
        response = self.client.get("/api/auth/google/config/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["client_id"], "test-client.apps.googleusercontent.com")
