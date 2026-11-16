from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import SoftJWTAuthentication
from speaking.models import AssessmentLink, Evaluation, SpeakingSession
from speaking.rubric import RUBRIC
from speaking.services import (
    CLOSED_MESSAGES,
    build_progress,
    clean_evaluator_name,
    hydrate_sessions,
    closed_reason,
    create_link,
    link_is_open,
    parse_review,
    clean_session_video,
    parse_session,
    public_assessment,
    random_topic,
    save_evaluation,
    session_detail,
    session_summary,
)


def owned_queryset(user):
    return SpeakingSession.objects.filter(user=user).order_by("-practiced_on", "-id")


def owned_sessions(user):
    return hydrate_sessions(owned_queryset(user))


def get_owned(user, session_id):
    session = owned_queryset(user).filter(pk=session_id).first()
    if session is None:
        raise NotFound("That session does not exist.")
    return hydrate_sessions([session])[0]


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"ok": True})


class RubricView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SoftJWTAuthentication]

    def get(self, request):
        return Response(RUBRIC)


class RandomTopicView(APIView):
    def get(self, request):
        tag = request.query_params.get("tag", "").strip() or None
        avoid = request.query_params.get("avoid", "").strip() or None
        return Response(random_topic(tag, avoid))


class SessionListCreate(APIView):
    def get(self, request):
        sessions = owned_sessions(request.user)
        return Response([session_summary(session) for session in sessions])

    def post(self, request):
        fields = parse_session(request.data)
        video = clean_session_video(request.FILES.get("video"))
        with transaction.atomic():
            session = SpeakingSession.objects.create(user=request.user, video=video, **fields)
            create_link(session, days=14)
        return Response(session_detail(get_owned(request.user, session.id)), status=201)


class SessionDetail(APIView):
    def get(self, request, session_id):
        return Response(session_detail(get_owned(request.user, session_id)))

    def patch(self, request, session_id):
        session = get_owned(request.user, session_id)
        update_fields = []
        if "notes" in request.data:
            notes = str(request.data.get("notes", "")).strip()
            if len(notes) > 2000:
                raise ValidationError({"notes": "Keep private notes under 2000 characters."})
            session.notes = notes
            update_fields.append("notes")
        if "focus" in request.data:
            focus = str(request.data.get("focus", "")).strip()
            if len(focus) > 240:
                raise ValidationError({"focus": "Keep the focus note shorter."})
            session.focus = focus
            update_fields.append("focus")
        if update_fields:
            session.save(update_fields=update_fields)
        return Response(session_detail(get_owned(request.user, session.id)))

    def delete(self, request, session_id):
        session = get_owned(request.user, session_id)
        session.delete()
        return Response(status=204)


class SessionLinks(APIView):
    def post(self, request, session_id):
        session = get_owned(request.user, session_id)
        if "expires_in_days" not in request.data:
            days = 14
        else:
            days = request.data.get("expires_in_days")
        if days in (None, "", "none"):
            parsed = None
        else:
            try:
                parsed = int(days)
            except (TypeError, ValueError):
                raise ValidationError({"expires_in_days": "Choose 7, 14, 30 days, or no expiry."})
            if parsed not in (7, 14, 30):
                raise ValidationError({"expires_in_days": "Choose 7, 14, 30 days, or no expiry."})
        create_link(session, parsed)
        return Response(session_detail(get_owned(request.user, session.id)), status=201)


class RevokeLink(APIView):
    def post(self, request, link_id):
        link = AssessmentLink.objects.select_related("session").filter(pk=link_id, session__user=request.user).first()
        if link is None:
            raise NotFound("That link does not exist.")
        if link.revoked_at is None:
            link.revoked_at = timezone.now()
            link.save(update_fields=["revoked_at"])
        return Response(session_detail(get_owned(request.user, link.session_id)))


class SelfEvaluation(APIView):
    def post(self, request, session_id):
        session = get_owned(request.user, session_id)
        if any(evaluation.kind == Evaluation.SELF for evaluation in session.evaluations.all()):
            return Response({"detail": "You already saved a self-assessment for this session."}, status=409)
        parsed = parse_review(request.data)
        try:
            with transaction.atomic():
                save_evaluation(
                    session=session,
                    link=None,
                    kind=Evaluation.SELF,
                    name=request.user.name,
                    key=f"self-{request.user.id}",
                    **parsed,
                )
        except IntegrityError:
            return Response({"detail": "You already saved a self-assessment for this session."}, status=409)
        return Response(session_detail(get_owned(request.user, session.id)), status=201)


class AssessView(APIView):
    authentication_classes = [SoftJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, token):
        link = _link(token)
        owner = bool(request.user.is_authenticated and request.user.id == link.session.user_id)
        return Response(public_assessment(link, owner))

    def post(self, request, token):
        link = _link(token)
        if request.user.is_authenticated and request.user.id == link.session.user_id:
            raise ValidationError("This is your session. Use self-assessment instead of the guest link.")
        if not link_is_open(link):
            reason = closed_reason(link)
            return Response(
                {"detail": CLOSED_MESSAGES.get(reason, "This assessment link is closed."), "closed_reason": reason},
                status=410,
            )
        name = clean_evaluator_name(request.data.get("evaluator_name", ""))
        key = name.lower()
        if Evaluation.objects.filter(link=link, evaluator_key=key).exists():
            return Response({"detail": f"{name} already submitted a review on this link."}, status=409)
        parsed = parse_review(request.data)
        try:
            with transaction.atomic():
                save_evaluation(
                    session=link.session,
                    link=link,
                    kind=Evaluation.PEER,
                    name=name,
                    key=key,
                    **parsed,
                )
        except IntegrityError:
            return Response({"detail": f"{name} already submitted a review on this link."}, status=409)
        return Response({"detail": "Review saved.", "evaluator_name": name}, status=201)


class ProgressView(APIView):
    def get(self, request):
        return Response(build_progress(request.user))


def _link(token):
    link = AssessmentLink.objects.select_related("session__user").filter(token=token).first()
    if link is None:
        raise NotFound("This assessment link does not exist.")
    return link
