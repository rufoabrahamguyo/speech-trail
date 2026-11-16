from django.urls import path

from speaking.views import (
    AssessView,
    HealthView,
    ProgressView,
    RandomTopicView,
    RevokeLink,
    RubricView,
    SelfEvaluation,
    SessionDetail,
    SessionLinks,
    SessionListCreate,
)

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("rubric/", RubricView.as_view()),
    path("topics/random/", RandomTopicView.as_view()),
    path("sessions/", SessionListCreate.as_view()),
    path("sessions/<str:session_id>/", SessionDetail.as_view()),
    path("sessions/<str:session_id>/links/", SessionLinks.as_view()),
    path("sessions/<str:session_id>/self/", SelfEvaluation.as_view()),
    path("links/<str:link_id>/revoke/", RevokeLink.as_view()),
    path("assess/<str:token>/", AssessView.as_view()),
    path("progress/", ProgressView.as_view()),
]
