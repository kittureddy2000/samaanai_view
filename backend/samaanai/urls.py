from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from apps.users.views import social_auth_token, user_detail

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/samaanai/', include('apps.nutrition.urls')),
    path('api/auth/social/', include('social_django.urls', namespace='social')),
    path('api/auth/social/token/', social_auth_token, name='social_token'),
    path('api/users/me/', user_detail, name='user_detail'),
]