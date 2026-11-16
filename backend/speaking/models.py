from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.db import models


def session_video_path(instance, filename):
    extension = Path(filename).suffix.lower()
    if extension not in {".mp4", ".webm", ".mov"}:
        extension = ".mp4"
    return f"session-videos/{uuid4().hex}{extension}"


class SpeakingSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessions")
    topic = models.CharField(max_length=180)
    prompt_tag = models.CharField(max_length=32, blank=True, default="")
    duration_minutes = models.PositiveSmallIntegerField()
    practiced_on = models.DateField()
    focus = models.CharField(max_length=240, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    video = models.FileField(upload_to=session_video_path, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-practiced_on", "-id"]

    def __str__(self):
        return self.topic

    def delete(self, *args, **kwargs):
        video = self.video
        super().delete(*args, **kwargs)
        if video:
            video.delete(save=False)


class AssessmentLink(models.Model):
    session = models.ForeignKey(SpeakingSession, on_delete=models.CASCADE, related_name="links")
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.token


class Evaluation(models.Model):
    PEER = "peer"
    SELF = "self"
    KIND_CHOICES = [(PEER, "Peer"), (SELF, "Self")]

    session = models.ForeignKey(SpeakingSession, on_delete=models.CASCADE, related_name="evaluations")
    link = models.ForeignKey(AssessmentLink, null=True, blank=True, on_delete=models.SET_NULL, related_name="evaluations")
    kind = models.CharField(max_length=8, choices=KIND_CHOICES, default=PEER)
    evaluator_name = models.CharField(max_length=80)
    evaluator_key = models.CharField(max_length=80)
    strengths = models.TextField()
    improvements = models.TextField()
    comments = models.TextField(blank=True, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["session"],
                condition=models.Q(kind="self"),
                name="one_self_review_per_session",
            ),
        ]

    def __str__(self):
        return f"{self.evaluator_name} on {self.session_id}"


class EvaluationScore(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="scores")
    category = models.CharField(max_length=32)
    score = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["evaluation", "category"], name="one_score_per_category"),
        ]


class ChecklistResponse(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="checks")
    category = models.CharField(max_length=32)
    item_key = models.CharField(max_length=32)
    checked = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["evaluation", "category", "item_key"],
                name="one_response_per_item",
            )
        ]
