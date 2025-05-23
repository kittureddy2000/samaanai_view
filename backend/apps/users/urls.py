from django.urls import path
from .views import RegisterView, UserProfileView, ProfileMetricsUpdateView, social_auth_token

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/metrics/', ProfileMetricsUpdateView.as_view(), name='profile-metrics'),
    path('api/auth/social/token/', social_auth_token, name='social_token'),
]