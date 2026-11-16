from django.contrib import admin

from speaking.models import AssessmentLink, Evaluation, SpeakingSession


@admin.register(SpeakingSession)
class SpeakingSessionAdmin(admin.ModelAdmin):
    list_display = ("topic", "user", "practiced_on", "duration_minutes")
    search_fields = ("topic", "user__email", "user__name")
    list_select_related = ("user",)


@admin.register(AssessmentLink)
class AssessmentLinkAdmin(admin.ModelAdmin):
    list_display = ("session", "expires_at", "revoked_at", "created_at")
    search_fields = ("token", "session__topic")
    list_select_related = ("session",)


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ("evaluator_name", "kind", "session", "submitted_at")
    list_select_related = ("session",)
    search_fields = ("evaluator_name", "session__topic")
