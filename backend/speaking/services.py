import random
import secrets
from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from speaking.models import (
    AssessmentLink,
    ChecklistResponse,
    Evaluation,
    EvaluationScore,
    SpeakingSession,
)
from speaking.rubric import CATEGORIES, CATEGORY_INDEX, ITEMS, RUBRIC
from speaking.topics import TAG_LABELS, TOPICS

NEXT_ADVICE = {
    "confidence": "Next time, start standing still for the first two sentences and look at one person before you gesture.",
    "voice": "Next time, mark three places to pause. Take the pause instead of filling it.",
    "content": "Write the first sentence and the last sentence before you start. Speak the middle.",
    "audience": "Talk to one person in the room. Ask them something in the first minute.",
    "language": "Choose three exact words you want heard, and say each one a little more slowly.",
}

CLOSED_MESSAGES = {
    "revoked": "This assessment link has been turned off.",
    "expired": "This assessment link has expired.",
}


def as_id(value):
    return None if value is None else str(value)


def hydrate_sessions(sessions):
    sessions = list(sessions)
    if not sessions:
        return sessions
    session_ids = [session.id for session in sessions]
    links = list(AssessmentLink.objects.filter(session_id__in=session_ids))
    evaluations = list(Evaluation.objects.filter(session_id__in=session_ids))
    evaluation_ids = [evaluation.id for evaluation in evaluations]
    scores = list(EvaluationScore.objects.filter(evaluation_id__in=evaluation_ids)) if evaluation_ids else []
    checks = list(ChecklistResponse.objects.filter(evaluation_id__in=evaluation_ids)) if evaluation_ids else []

    links_by_session = {}
    evaluations_by_session = {}
    scores_by_evaluation = {}
    checks_by_evaluation = {}
    for link in links:
        links_by_session.setdefault(link.session_id, []).append(link)
    for evaluation in evaluations:
        evaluations_by_session.setdefault(evaluation.session_id, []).append(evaluation)
        scores_by_evaluation.setdefault(evaluation.id, [])
        checks_by_evaluation.setdefault(evaluation.id, [])
    for score in scores:
        scores_by_evaluation.setdefault(score.evaluation_id, []).append(score)
    for check in checks:
        checks_by_evaluation.setdefault(check.evaluation_id, []).append(check)
    for evaluation in evaluations:
        evaluation._prefetched_objects_cache = {
            "scores": scores_by_evaluation.get(evaluation.id, []),
            "checks": checks_by_evaluation.get(evaluation.id, []),
        }
    for session in sessions:
        session._prefetched_objects_cache = {
            "links": links_by_session.get(session.id, []),
            "evaluations": evaluations_by_session.get(session.id, []),
        }
    return sessions


def random_topic(tag=None, avoid=None):
    pool = [topic for topic in TOPICS if topic["tag"] == tag] if tag in TAG_LABELS else list(TOPICS)
    if avoid:
        filtered = [topic for topic in pool if topic["text"] != avoid]
        if filtered:
            pool = filtered
    choice = random.choice(pool)
    return {"topic": choice["text"], "tag": choice["tag"], "tag_label": TAG_LABELS[choice["tag"]]}


def create_link(session, days):
    expires_at = None if days is None else timezone.now() + timedelta(days=days)
    for _ in range(3):
        token = secrets.token_urlsafe(32)
        try:
            with transaction.atomic():
                return AssessmentLink.objects.create(session=session, token=token, expires_at=expires_at)
        except IntegrityError:
            continue
    raise RuntimeError("Could not generate a unique assessment token.")


def link_is_open(link):
    if link.revoked_at is not None:
        return False
    if link.expires_at is not None and link.expires_at <= timezone.now():
        return False
    return True


def closed_reason(link):
    if link_is_open(link):
        return None
    if link.revoked_at is not None:
        return "revoked"
    return "expired"


def peer_evaluations(session):
    return [evaluation for evaluation in session.evaluations.all() if evaluation.kind == Evaluation.PEER]


def review_average(evaluation):
    scores = [score.score for score in evaluation.scores.all()]
    if not scores:
        return None
    return sum(scores) / len(scores)


def peer_average(session):
    averages = [review_average(evaluation) for evaluation in peer_evaluations(session)]
    averages = [value for value in averages if value is not None]
    if not averages:
        return None
    return round(sum(averages) / len(averages), 2)


def session_status(session):
    if peer_evaluations(session):
        return "reviewed"
    if any(link_is_open(link) for link in session.links.all()):
        return "awaiting"
    return "ready"


def evaluation_payload(evaluation):
    score_rows = [
        {
            "category": score.category,
            "label": CATEGORIES[score.category]["label"] if score.category in CATEGORIES else score.category,
            "score": score.score,
        }
        for score in evaluation.scores.all()
    ]
    score_rows.sort(key=lambda row: CATEGORY_INDEX.get(row["category"], 99))
    checks = [
        {
            "category": check.category,
            "item_key": check.item_key,
            "label": ITEMS.get((check.category, check.item_key), check.item_key),
            "checked": check.checked,
        }
        for check in evaluation.checks.all()
    ]
    checks.sort(key=lambda row: (CATEGORY_INDEX.get(row["category"], 99), row["label"]))
    values = [row["score"] for row in score_rows]
    average = round(sum(values) / len(values), 2) if values else None
    return {
        "id": as_id(evaluation.id),
        "kind": evaluation.kind,
        "evaluator_name": evaluation.evaluator_name,
        "strengths": evaluation.strengths,
        "improvements": evaluation.improvements,
        "comments": evaluation.comments,
        "submitted_at": evaluation.submitted_at,
        "scores": score_rows,
        "checks": checks,
        "average": average,
    }


def link_payload(link, session):
    return {
        "id": as_id(link.id),
        "token": link.token,
        "created_at": link.created_at,
        "expires_at": link.expires_at,
        "revoked_at": link.revoked_at,
        "active": link_is_open(link),
        "submission_count": sum(1 for evaluation in session.evaluations.all() if evaluation.link_id == link.id),
    }


def session_summary(session):
    peers = peer_evaluations(session)
    self_count = sum(1 for evaluation in session.evaluations.all() if evaluation.kind == Evaluation.SELF)
    return {
        "id": as_id(session.id),
        "topic": session.topic,
        "prompt_tag": session.prompt_tag,
        "prompt_label": TAG_LABELS.get(session.prompt_tag) if session.prompt_tag else None,
        "duration_minutes": session.duration_minutes,
        "practiced_on": session.practiced_on,
        "focus": session.focus,
        "created_at": session.created_at,
        "status": session_status(session),
        "peer_average": peer_average(session),
        "peer_count": len(peers),
        "self_count": self_count,
    }


def session_detail(session):
    evaluations = sorted(session.evaluations.all(), key=lambda item: item.submitted_at, reverse=True)
    links = sorted(session.links.all(), key=lambda item: item.created_at, reverse=True)
    return {
        **session_summary(session),
        "notes": session.notes,
        "links": [link_payload(link, session) for link in links],
        "evaluations": [evaluation_payload(evaluation) for evaluation in evaluations],
    }


def public_assessment(link, viewer_is_owner):
    session = link.session
    is_open = link_is_open(link)
    reason = closed_reason(link)
    return {
        "speaker_name": session.user.name,
        "topic": session.topic,
        "duration_minutes": session.duration_minutes,
        "practiced_on": session.practiced_on,
        "focus": session.focus,
        "active": is_open,
        "closed_reason": reason,
        "viewer_is_owner": viewer_is_owner,
        "session_id": as_id(session.id) if viewer_is_owner else None,
        "rubric": RUBRIC if is_open and not viewer_is_owner else [],
    }


def parse_session(data):
    if not isinstance(data, dict):
        raise ValidationError("Send a session.")
    topic = " ".join(str(data.get("topic", "")).split())
    if len(topic) < 4:
        raise ValidationError({"topic": "Give the session a topic of at least a few words."})
    if len(topic) > 180:
        raise ValidationError({"topic": "Keep the topic under 180 characters."})
    try:
        duration = int(data.get("duration_minutes"))
    except (TypeError, ValueError):
        raise ValidationError({"duration_minutes": "Choose a duration."})
    if duration < 1 or duration > 30:
        raise ValidationError({"duration_minutes": "Use a duration between 1 and 30 minutes."})
    try:
        practiced = datetime.strptime(str(data.get("practiced_on")), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ValidationError({"practiced_on": "Use a valid date."})
    today = timezone.now().date()
    if practiced > today + timedelta(days=1):
        raise ValidationError({"practiced_on": "That date is too far in the future."})
    if practiced < today - timedelta(days=365):
        raise ValidationError({"practiced_on": "Use a date within the last year."})
    focus = str(data.get("focus", "")).strip()
    notes = str(data.get("notes", "")).strip()
    if len(focus) > 240:
        raise ValidationError({"focus": "Keep the focus note shorter."})
    if len(notes) > 2000:
        raise ValidationError({"notes": "Keep private notes under 2000 characters."})
    tag = str(data.get("prompt_tag", "")).strip()
    if tag not in TAG_LABELS:
        tag = ""
    return {
        "topic": topic,
        "duration_minutes": duration,
        "practiced_on": practiced,
        "focus": focus,
        "notes": notes,
        "prompt_tag": tag,
    }


def clean_evaluator_name(name):
    cleaned = " ".join(str(name).split())
    if len(cleaned) < 2:
        raise ValidationError({"evaluator_name": "Add your name so the speaker knows who reviewed them."})
    if len(cleaned) > 80:
        raise ValidationError({"evaluator_name": "Use a shorter name."})
    return cleaned


def parse_review(data):
    if not isinstance(data, dict):
        raise ValidationError("Send a review.")
    strengths = str(data.get("strengths", "")).strip()
    improvements = str(data.get("improvements", "")).strip()
    comments = str(data.get("comments", "")).strip()
    if len(strengths) < 8:
        raise ValidationError({"strengths": "Say a little more about what worked."})
    if len(improvements) < 8:
        raise ValidationError({"improvements": "Say a little more about what to improve."})
    if len(strengths) > 2000 or len(improvements) > 2000 or len(comments) > 2000:
        raise ValidationError("Keep each comment under 2000 characters.")
    return {
        "strengths": strengths,
        "improvements": improvements,
        "comments": comments,
        "score_map": _scores(data.get("scores")),
        "check_map": _checks(data.get("checks", [])),
    }


def _scores(raw):
    if not isinstance(raw, list):
        raise ValidationError({"scores": "Rate every category."})
    found = {}
    valid_keys = set(CATEGORIES)
    for row in raw:
        if not isinstance(row, dict):
            raise ValidationError({"scores": "Each score needs a category."})
        key = row.get("category")
        if key not in valid_keys or key in found:
            raise ValidationError({"scores": "Rate each category once."})
        score = row.get("score")
        if isinstance(score, bool) or score not in (1, 2, 3, 4, 5):
            raise ValidationError({"scores": "Scores run from 1 to 5."})
        found[key] = score
    if set(found) != valid_keys:
        raise ValidationError({"scores": "Rate every category."})
    return found


def _checks(raw):
    if raw is None:
        raw = []
    if not isinstance(raw, list):
        raise ValidationError({"checks": "Checklist responses should be a list."})
    found = {}
    for row in raw:
        if not isinstance(row, dict):
            raise ValidationError({"checks": "Each checklist row needs a category and an item."})
        pair = (row.get("category"), row.get("item_key"))
        if pair not in ITEMS:
            raise ValidationError({"checks": "That checklist item is not part of the rubric."})
        if pair in found:
            raise ValidationError({"checks": "Each checklist item should appear once."})
        found[pair] = bool(row.get("checked"))
    return found


def save_evaluation(*, session, link, kind, name, key, strengths, improvements, comments, score_map, check_map):
    evaluation = Evaluation.objects.create(
        session=session,
        link=link,
        kind=kind,
        evaluator_name=name,
        evaluator_key=key,
        strengths=strengths,
        improvements=improvements,
        comments=comments,
    )
    EvaluationScore.objects.bulk_create(
        [
            EvaluationScore(evaluation=evaluation, category=category["key"], score=score_map[category["key"]])
            for category in RUBRIC
        ]
    )
    ChecklistResponse.objects.bulk_create(
        [
            ChecklistResponse(
                evaluation=evaluation,
                category=category["key"],
                item_key=item["key"],
                checked=check_map.get((category["key"], item["key"]), False),
            )
            for category in RUBRIC
            for item in category["items"]
        ]
    )
    return evaluation


def _delta(values):
    if len(values) < 2:
        return None
    if len(values) >= 4:
        midpoint = len(values) // 2
        earlier, later = values[:midpoint], values[midpoint:]
    else:
        earlier, later = values[:-1], values[-1:]
    earlier_mean = sum(earlier) / len(earlier)
    later_mean = sum(later) / len(later)
    return round(later_mean - earlier_mean, 2)


def build_progress(user):
    sessions = hydrate_sessions(SpeakingSession.objects.filter(user=user))
    peer = []
    self_count = 0
    for session in sessions:
        for evaluation in session.evaluations.all():
            if evaluation.kind == Evaluation.PEER:
                peer.append((session, evaluation))
            else:
                self_count += 1
    peer.sort(key=lambda pair: pair[1].submitted_at)

    series = {category["key"]: [] for category in RUBRIC}
    timeline = []
    for session, evaluation in peer:
        score_map = {score.category: score.score for score in evaluation.scores.all()}
        values = []
        for category in RUBRIC:
            if category["key"] in score_map:
                series[category["key"]].append(score_map[category["key"]])
                values.append(score_map[category["key"]])
        timeline.append(
            {
                "id": as_id(evaluation.id),
                "session_id": as_id(session.id),
                "topic": session.topic,
                "evaluator_name": evaluation.evaluator_name,
                "submitted_at": evaluation.submitted_at,
                "average": round(sum(values) / len(values), 2) if values else None,
            }
        )

    categories = []
    for category in RUBRIC:
        values = series[category["key"]]
        categories.append(
            {
                "key": category["key"],
                "label": category["label"],
                "average": round(sum(values) / len(values), 2) if values else None,
                "count": len(values),
                "delta": _delta(values),
            }
        )

    ranked = [(index, category) for index, category in enumerate(categories) if category["average"] is not None]
    strongest = None
    next_focus = None
    categories_close = False
    if ranked:
        _, high = max(ranked, key=lambda pair: (pair[1]["average"], -pair[0]))
        _, low = min(ranked, key=lambda pair: (pair[1]["average"], pair[0]))
        strongest = {"key": high["key"], "label": high["label"], "average": high["average"]}
        spread = round(high["average"] - low["average"], 2)
        categories_close = spread < 0.3
        next_focus = {
            "key": low["key"],
            "label": low["label"],
            "average": low["average"],
            "advice": None if categories_close else NEXT_ADVICE.get(low["key"]),
        }

    item_stats = {}
    for _, evaluation in peer:
        for check in evaluation.checks.all():
            bucket = item_stats.setdefault((check.category, check.item_key), {"checked": 0, "total": 0})
            bucket["total"] += 1
            if check.checked:
                bucket["checked"] += 1

    items = []
    for category in RUBRIC:
        for item in category["items"]:
            bucket = item_stats.get((category["key"], item["key"]))
            if not bucket:
                continue
            items.append(
                {
                    "category": category["key"],
                    "category_label": category["label"],
                    "item_key": item["key"],
                    "label": item["label"],
                    "checked": bucket["checked"],
                    "missed": bucket["total"] - bucket["checked"],
                    "total": bucket["total"],
                }
            )

    if not peer:
        watch_mode = "none"
        watchouts = []
    elif len(peer) < 2:
        watch_mode = "latest"
        watchouts = [item for item in items if item["missed"] > 0]
    else:
        watch_mode = "recurring"
        watchouts = [item for item in items if item["missed"] > 0 and item["missed"] / item["total"] >= 0.5]
    watchouts.sort(key=lambda item: (-(item["missed"] / item["total"]), -item["missed"], item["label"]))
    watchouts = watchouts[:6]

    strengths = [
        item
        for item in items
        if item["checked"] > 0 and item["checked"] / item["total"] >= (1 if len(peer) < 2 else 0.75)
    ]
    strengths.sort(key=lambda item: (-(item["checked"] / item["total"]), item["label"]))
    strengths = strengths[:6]

    recent_pairs = []
    for session in sessions:
        for evaluation in session.evaluations.all():
            recent_pairs.append((session, evaluation))
    recent_pairs.sort(key=lambda pair: pair[1].submitted_at, reverse=True)
    recent = []
    for session, evaluation in recent_pairs[:8]:
        payload = evaluation_payload(evaluation)
        recent.append(
            {
                "id": payload["id"],
                "session_id": as_id(session.id),
                "topic": session.topic,
                "kind": payload["kind"],
                "evaluator_name": payload["evaluator_name"],
                "submitted_at": payload["submitted_at"],
                "average": payload["average"],
                "strengths": payload["strengths"],
                "improvements": payload["improvements"],
                "scores": payload["scores"],
            }
        )

    return {
        "sessions": len(sessions),
        "peer_reviews": len(peer),
        "self_reviews": self_count,
        "categories": categories,
        "strongest": strongest,
        "next_focus": next_focus,
        "categories_close": categories_close,
        "timeline": timeline,
        "watch_mode": watch_mode,
        "watchouts": watchouts,
        "strengths": strengths,
        "recent": recent,
    }
