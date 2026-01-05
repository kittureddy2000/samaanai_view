import sys
print("URLS: Starting URL module import", file=sys.stderr, flush=True)

from django.contrib import admin
from django.urls import path, include
print("URLS: Imported Django core", file=sys.stderr, flush=True)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
print("URLS: Imported JWT views", file=sys.stderr, flush=True)

from apps.users.views import social_auth_token
print("URLS: Imported users views", file=sys.stderr, flush=True)

from .health import health_check, ping
print("URLS: Imported health views", file=sys.stderr, flush=True)

from django.conf import settings
from django.conf.urls.static import static
print("URLS: Imported settings and static", file=sys.stderr, flush=True)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/finance/', include('apps.finance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/auth/social/', include('social_django.urls', namespace='social')),
    path('api/auth/social/token/', social_auth_token, name='social_token'),
    path('health/', health_check, name='health_check'),
    path('ping/', ping, name='ping'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)