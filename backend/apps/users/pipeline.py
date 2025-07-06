from django.shortcuts import redirect
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from urllib.parse import urlencode, parse_qs, urlparse
import logging

logger = logging.getLogger(__name__)

def generate_tokens_and_redirect_to_frontend(strategy, backend, user, response, *args, **kwargs):
    """
    Custom pipeline step for python-social-auth.
    Generates JWT tokens and redirects to the frontend callback URL
    with tokens and the original 'next' parameter.
    """
    try:
        logger.info(f"OAuth pipeline called for user: {user}")
        
        if not user:
            logger.error("No user provided to OAuth pipeline")
            # Should not happen if user is created/associated before this step
            return redirect(f"{settings.FRONTEND_URL}/login?error=social_auth_failed")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        logger.info("JWT tokens generated successfully")

        # Get the original 'next' parameter passed to the social login URL
        original_next_param = strategy.session_get('next') # Try session first
        if not original_next_param:
            original_next_param = strategy.request.GET.get('next', '/')
            if not original_next_param or original_next_param == '/':
                 original_next_param = strategy.session_get('postLoginRedirect', '/') # From React's sessionStorage via Login.js

        logger.info(f"Next parameter: {original_next_param}")

        # Ensure original_next_param is a simple path like '/finance' not a full URL
        if original_next_param and original_next_param.startswith('http'):
            parsed_url = urlparse(original_next_param)
            original_next_param = parsed_url.path
            if parsed_url.query:
                original_next_param += "?" + parsed_url.query
        elif not original_next_param:
            original_next_param = '/'

        # Construct the frontend callback URL with query parameters
        query_params = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'next': original_next_param  # The original intended path for the frontend
        }
        
        # Use path-based routing (BrowserRouter) – no hash fragment needed
        frontend_callback_url = f"{settings.FRONTEND_URL}/social-login-callback"
        redirect_url = f"{frontend_callback_url}?{urlencode(query_params)}"
        
        logger.info(f"Redirecting to: {redirect_url}")

        return redirect(redirect_url)
        
    except Exception as e:
        logger.error(f"Error in OAuth pipeline: {str(e)}")
        # Fallback redirect
        return redirect(f"{settings.FRONTEND_URL}/login?error=pipeline_error") 