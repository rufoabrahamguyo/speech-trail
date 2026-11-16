from django.conf import settings

from accounts.models import User


class GoogleAuthError(Exception):
    """A Google ID token cannot be accepted."""


class GoogleAuthNotConfigured(GoogleAuthError):
    """GOOGLE_CLIENT_ID is missing or the verifier is not installed."""


class GoogleAccountConflict(GoogleAuthError):
    """This email is already linked to a different Google account."""


def verify_google_id_token(credential):
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise GoogleAuthNotConfigured("Google sign-in is not installed on the API.") from exc

    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or ""
    if not client_id:
        raise GoogleAuthNotConfigured("Google sign-in is not configured.")
    if not credential:
        raise GoogleAuthError("Google credential is required.")
    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience=client_id,
            clock_skew_in_seconds=10,
        )
    except ValueError as exc:
        raise GoogleAuthError("That Google sign-in could not be verified.") from exc

    issuer = idinfo.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleAuthError("That Google sign-in could not be verified.")
    if not idinfo.get("sub") or not idinfo.get("email"):
        raise GoogleAuthError("Google did not share an email address.")
    if not idinfo.get("email_verified"):
        raise GoogleAuthError("That Google email is not verified.")
    return idinfo


def display_name(idinfo):
    name = " ".join(str(idinfo.get("name") or "").split())
    if len(name) < 2:
        given = str(idinfo.get("given_name") or "").strip()
        family = str(idinfo.get("family_name") or "").strip()
        name = " ".join(f"{given} {family}".split())
    if len(name) < 2:
        local = str(idinfo.get("email") or "").split("@")[0]
        name = " ".join(local.replace(".", " ").replace("_", " ").replace("-", " ").split())
    if len(name) < 2:
        name = "Speaker"
    return name[:80]


def upsert_google_user(idinfo):
    sub = str(idinfo["sub"])
    email = User.objects.normalize_email(idinfo["email"]).lower()
    linked = User.objects.filter(google_sub=sub).first()
    if linked:
        if linked.email != email and not User.objects.filter(email=email).exclude(pk=linked.pk).exists():
            linked.email = email
            linked.save(update_fields=["email"])
        return linked

    existing = User.objects.filter(email=email).first()
    if existing:
        if existing.google_sub and existing.google_sub != sub:
            raise GoogleAccountConflict("This email is already linked to another Google account.")
        existing.google_sub = sub
        existing.save(update_fields=["google_sub"])
        return existing

    user = User(email=email, name=display_name(idinfo), google_sub=sub)
    user.set_unusable_password()
    user.save()
    return user
