from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "SpeakTrack"
admin.site.site_title = "SpeakTrack"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("speaking.urls")),
]
