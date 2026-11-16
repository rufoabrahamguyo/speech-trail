from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from speaking.models import Evaluation
from speaking.rubric import RUBRIC
from speaking.topics import TAG_LABELS

EXPECTED_CHECKS = sum(len(category["items"]) for category in RUBRIC)


def review_body(name="Maya", score=4, skip_item="pauses"):
    scores = [{"category": category["key"], "score": score} for category in RUBRIC]
    checks = []
    for category in RUBRIC:
        for item in category["items"]:
            checks.append(
                {
                    "category": category["key"],
                    "item_key": item["key"],
                    "checked": item["key"] != skip_item,
                }
            )
    return {
        "evaluator_name": name,
        "strengths": "Clear opening and a calm pace throughout the talk.",
        "improvements": "The ending needs a clearer final line.",
        "comments": "Thank you for letting me listen.",
        "scores": scores,
        "checks": checks,
    }


class SpeakTrackApiTests(APITestCase):
    def register(self, email="hidden-mailbox@example.com", name="Rufo", aim=""):
        client = APIClient()
        response = client.post(
            "/api/auth/register/",
            {"email": email, "name": name, "password": "speak-well-1", "aim": aim},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return client, response.data

    def create_session(self, client, **overrides):
        payload = {
            "topic": "Is technology making us smarter?",
            "duration_minutes": 3,
            "practiced_on": timezone.now().date().isoformat(),
            "focus": "Please watch my pace.",
            "notes": "do not show this private note",
            "prompt_tag": "impromptu",
        }
        payload.update(overrides)
        response = client.post("/api/sessions/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data

    def test_register_login_and_profile(self):
        client, created = self.register(aim="Sound calmer in seminars")
        self.assertEqual(created["user"]["name"], "Rufo")
        self.assertNotIn("password", created["user"])

        me = client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["aim"], "Sound calmer in seminars")

        renamed = client.patch("/api/auth/me/", {"name": "Rufo G.", "aim": "Shorter openings"}, format="json")
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.data["name"], "Rufo G.")

        wrong = client.post(
            "/api/auth/password/",
            {"current_password": "nope-nope", "new_password": "another-good-1"},
            format="json",
        )
        self.assertEqual(wrong.status_code, 400)

        changed = client.post(
            "/api/auth/password/",
            {"current_password": "speak-well-1", "new_password": "another-good-1"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)

        guest = APIClient()
        denied = guest.get("/api/sessions/")
        self.assertEqual(denied.status_code, 401)

        logged_in = guest.post(
            "/api/auth/login/",
            {"email": "Hidden-Mailbox@example.com", "password": "another-good-1"},
            format="json",
        )
        self.assertEqual(logged_in.status_code, 200, logged_in.content)
        self.assertEqual(logged_in.data["user"]["email"], "hidden-mailbox@example.com")

        duplicate = guest.post(
            "/api/auth/register/",
            {"email": "hidden-mailbox@example.com", "name": "Other", "password": "speak-well-1"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)

    def test_guest_review_is_private_and_saved(self):
        client, _ = self.register()
        session = self.create_session(client)
        token = session["links"][0]["token"]
        self.assertGreaterEqual(len(token), 20)
        self.assertIn("notes", session)

        listing = client.get("/api/sessions/")
        self.assertEqual(listing.status_code, 200)
        self.assertNotIn("notes", listing.data[0])
        self.assertEqual(listing.data[0]["status"], "awaiting")

        guest = APIClient()
        public = guest.get(f"/api/assess/{token}/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["speaker_name"], "Rufo")
        self.assertEqual(public.data["focus"], "Please watch my pace.")
        self.assertTrue(public.data["active"])
        self.assertFalse(public.data["viewer_is_owner"])
        self.assertIsNone(public.data["session_id"])
        body = str(public.content)
        self.assertNotIn("hidden-mailbox", body)
        self.assertNotIn("do not show this private note", body)

        saved = guest.post(f"/api/assess/{token}/", review_body(), format="json")
        self.assertEqual(saved.status_code, 201, saved.content)
        self.assertEqual(Evaluation.objects.count(), 1)
        self.assertEqual(Evaluation.objects.get().scores.count(), len(RUBRIC))
        self.assertEqual(Evaluation.objects.get().checks.count(), EXPECTED_CHECKS)
        self.assertTrue(Evaluation.objects.get().checks.filter(item_key="pauses", checked=False).exists())

        detail = client.get(f"/api/sessions/{session['id']}/")
        self.assertEqual(detail.data["status"], "reviewed")
        self.assertEqual(detail.data["peer_average"], 4)
        self.assertEqual(detail.data["evaluations"][0]["evaluator_name"], "Maya")
        self.assertEqual(detail.data["notes"], "do not show this private note")

    def test_partial_scores_are_rejected(self):
        client, _ = self.register()
        session = self.create_session(client)
        token = session["links"][0]["token"]
        body = review_body()
        body["scores"] = body["scores"][:-1]
        guest = APIClient()
        response = guest.post(f"/api/assess/{token}/", body, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Evaluation.objects.count(), 0)

    def test_duplicate_and_closed_links(self):
        client, _ = self.register()
        session = self.create_session(client)
        token = session["links"][0]["token"]
        link_id = session["links"][0]["id"]
        guest = APIClient()
        first = guest.post(f"/api/assess/{token}/", review_body(), format="json")
        self.assertEqual(first.status_code, 201, first.content)
        second = guest.post(f"/api/assess/{token}/", review_body(name=" maya "), format="json")
        self.assertEqual(second.status_code, 409)
        other = guest.post(f"/api/assess/{token}/", review_body(name="Jon", score=5), format="json")
        self.assertEqual(other.status_code, 201, other.content)

        revoked = client.post(f"/api/links/{link_id}/revoke/")
        self.assertEqual(revoked.status_code, 200)
        self.assertFalse(revoked.data["links"][0]["active"])
        blocked = guest.post(f"/api/assess/{token}/", review_body(name="Amina"), format="json")
        self.assertEqual(blocked.status_code, 410)

        fresh = client.post(f"/api/sessions/{session['id']}/links/", {"expires_in_days": 7}, format="json")
        self.assertEqual(fresh.status_code, 201)
        new_link = next(link for link in fresh.data["links"] if link["active"])
        from speaking.models import AssessmentLink

        row = AssessmentLink.objects.get(pk=new_link["id"])
        row.expires_at = timezone.now() - timedelta(minutes=1)
        row.save(update_fields=["expires_at"])
        expired = guest.post(f"/api/assess/{row.token}/", review_body(name="Sam"), format="json")
        self.assertEqual(expired.status_code, 410)
        self.assertEqual(expired.data["closed_reason"], "expired")

    def test_owner_cannot_use_guest_link_and_can_self_assess(self):
        client, _ = self.register()
        session = self.create_session(client)
        token = session["links"][0]["token"]
        preview = client.get(f"/api/assess/{token}/")
        self.assertTrue(preview.data["viewer_is_owner"])
        self.assertEqual(preview.data["session_id"], session["id"])
        self.assertEqual(preview.data["rubric"], [])

        blocked = client.post(f"/api/assess/{token}/", review_body(name="Rufo"), format="json")
        self.assertEqual(blocked.status_code, 400)

        self_review = client.post(f"/api/sessions/{session['id']}/self/", review_body(score=2), format="json")
        self.assertEqual(self_review.status_code, 201, self_review.content)
        self.assertEqual(self_review.data["peer_average"], None)
        self.assertEqual(self_review.data["self_count"], 1)
        again = client.post(f"/api/sessions/{session['id']}/self/", review_body(score=3), format="json")
        self.assertEqual(again.status_code, 409)

    def test_other_user_cannot_read_or_revoke(self):
        owner, _ = self.register()
        session = self.create_session(owner)
        other, _ = self.register(email="friend@example.com", name="Friend")
        hidden = other.get(f"/api/sessions/{session['id']}/")
        self.assertEqual(hidden.status_code, 404)
        revoked = other.post(f"/api/links/{session['links'][0]['id']}/revoke/")
        self.assertEqual(revoked.status_code, 404)
        missing = other.get("/api/assess/not-a-real-token/")
        self.assertEqual(missing.status_code, 404)

    def test_progress_uses_peer_category_averages(self):
        client, _ = self.register()
        session = self.create_session(client)
        token = session["links"][0]["token"]
        guest = APIClient()
        self.assertEqual(guest.post(f"/api/assess/{token}/", review_body(name="Maya", score=3), format="json").status_code, 201)
        self.assertEqual(guest.post(f"/api/assess/{token}/", review_body(name="Jon", score=5), format="json").status_code, 201)
        self_review = client.post(f"/api/sessions/{session['id']}/self/", review_body(score=1), format="json")
        self.assertEqual(self_review.status_code, 201, self_review.content)

        second = self.create_session(client, topic="Explain a mistake and what changed.")
        second_self = client.post(f"/api/sessions/{second['id']}/self/", review_body(score=1), format="json")
        self.assertEqual(second_self.status_code, 201, second_self.content)

        progress = client.get("/api/progress/")
        self.assertEqual(progress.status_code, 200, progress.content)
        self.assertEqual(progress.data["peer_reviews"], 2)
        self.assertEqual(progress.data["self_reviews"], 2)
        self.assertEqual(progress.data["sessions"], 2)
        confidence = next(category for category in progress.data["categories"] if category["key"] == "confidence")
        self.assertEqual(confidence["average"], 4)
        self.assertEqual(confidence["delta"], 2)
        self.assertEqual(confidence["count"], 2)
        self.assertTrue(progress.data["categories_close"])
        self.assertIsNone(progress.data["next_focus"]["advice"])
        self.assertEqual(progress.data["watch_mode"], "recurring")
        self.assertTrue(any(item["item_key"] == "pauses" for item in progress.data["watchouts"]))
        self.assertEqual(len(progress.data["timeline"]), 2)
        detail = client.get(f"/api/sessions/{session['id']}/")
        self.assertEqual(detail.data["peer_average"], 4)

    def test_random_topic_respects_a_known_tag(self):
        client, _ = self.register()
        response = client.get("/api/topics/random/?tag=work")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["tag"], "work")
        self.assertEqual(response.data["tag_label"], "Work")
        fallback = client.get("/api/topics/random/?tag=nope")
        self.assertIn(fallback.data["tag"], TAG_LABELS)
