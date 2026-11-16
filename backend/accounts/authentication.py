from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class SoftJWTAuthentication(JWTAuthentication):
    """Identify a valid logged-in user, but do not block guests when the token is stale."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None
