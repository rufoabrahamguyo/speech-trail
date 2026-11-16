from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.google_auth import (
    GoogleAccountConflict,
    GoogleAuthError,
    GoogleAuthNotConfigured,
    upsert_google_user,
    verify_google_id_token,
)
from accounts.serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_auth_payload(user), status=201)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer


def _auth_payload(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class GoogleConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"client_id": settings.GOOGLE_CLIENT_ID})


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = str(request.data.get("credential") or "").strip()
        try:
            idinfo = verify_google_id_token(credential)
            user = upsert_google_user(idinfo)
        except GoogleAuthNotConfigured as exc:
            return Response({"detail": str(exc)}, status=503)
        except GoogleAccountConflict as exc:
            return Response({"detail": str(exc)}, status=409)
        except GoogleAuthError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(_auth_payload(user))


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        if "name" in request.data:
            name = " ".join(str(request.data.get("name", "")).split())
            if len(name) < 2 or len(name) > 80:
                raise ValidationError({"name": "Use a name between 2 and 80 characters."})
            user.name = name
        if "aim" in request.data:
            aim = str(request.data.get("aim", "")).strip()
            if len(aim) > 180:
                raise ValidationError({"aim": "Keep the aim under 180 characters."})
            user.aim = aim
        user.save(update_fields=["name", "aim"])
        return Response(UserSerializer(user).data)


class PasswordView(APIView):
    def post(self, request):
        current = str(request.data.get("current_password", ""))
        new = str(request.data.get("new_password", ""))
        if not request.user.check_password(current):
            raise ValidationError({"current_password": "That current password is not right."})
        try:
            validate_password(new, request.user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": list(exc.messages)})
        request.user.set_password(new)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})
