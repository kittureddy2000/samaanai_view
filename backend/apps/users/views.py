from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserSerializer, RegisterSerializer, ProfileUpdateSerializer
from django.http import HttpResponseRedirect, JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken
import logging
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from rest_framework_simplejwt.authentication import JWTAuthentication
import urllib.parse
from django.conf import settings

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    """View for user registration"""
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating user profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class ProfileMetricsUpdateView(generics.UpdateAPIView):
    """View for updating only profile metrics"""
    serializer_class = ProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user.profile

def social_auth_token(request):
    """Generate JWT tokens after successful social authentication and redirect to frontend."""
    logger.info("Social auth token view called")
    if not request.user.is_authenticated:
        logger.error("User not authenticated in social_auth_token view")
        # Redirect back to login with error
        frontend_base = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
        return HttpResponseRedirect(f'{frontend_base}/login?error=authentication_failed')
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(request.user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    logger.info(f"Generated tokens for user: {request.user.username}")
    
    # Use environment-based frontend URL
    frontend_base = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
    frontend_callback_url = f'{frontend_base}/social-login-callback'
    params = urllib.parse.urlencode({
        'access_token': access_token,
        'refresh_token': refresh_token
    })
    redirect_url = f"{frontend_callback_url}?{params}"
    logger.info(f"Redirecting to: {redirect_url}")
    return HttpResponseRedirect(redirect_url)

    # Option 2: Return JSON (Requires frontend callback page to make a fetch call)
    # return JsonResponse({
    #     'access': access_token,
    #     'refresh': refresh_token,
    #     'user_id': request.user.id # Send user info if needed
    # })

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_detail(request):
    """Get current user details including profile"""
    user = request.user
    # Make sure the user has a profile
    UserProfile.objects.get_or_create(user=user)
    
    serializer = UserSerializer(user)
    return Response(serializer.data)