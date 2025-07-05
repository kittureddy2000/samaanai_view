from django.urls import path
from .views import (
    RegisterView, UserProfileView, ProfileMetricsUpdateView, social_auth_token,
    webauthn_register_begin, webauthn_register_complete,
    webauthn_authenticate_begin, webauthn_authenticate_complete,
    webauthn_credentials, webauthn_credential_delete
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/metrics/', ProfileMetricsUpdateView.as_view(), name='profile-metrics'),
    
    # WebAuthn endpoints
    path('webauthn/register/begin/', webauthn_register_begin, name='webauthn_register_begin'),
    path('webauthn/register/complete/', webauthn_register_complete, name='webauthn_register_complete'),
    path('webauthn/authenticate/begin/', webauthn_authenticate_begin, name='webauthn_authenticate_begin'),
    path('webauthn/authenticate/complete/', webauthn_authenticate_complete, name='webauthn_authenticate_complete'),
    path('webauthn/credentials/', webauthn_credentials, name='webauthn_credentials'),
    path('webauthn/credentials/<int:credential_id>/delete/', webauthn_credential_delete, name='webauthn_credential_delete'),
    
    path('api/auth/social/token/', social_auth_token, name='social_token'),
]