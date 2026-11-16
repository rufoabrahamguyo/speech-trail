from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import GoogleConfigView, GoogleLoginView, LoginView, MeView, PasswordView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("google/", GoogleLoginView.as_view()),
    path("google/config/", GoogleConfigView.as_view()),
    path("refresh/", TokenRefreshView.as_view()),
    path("me/", MeView.as_view()),
    path("password/", PasswordView.as_view()),
]
