from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile, WebAuthnCredential
from .serializers import UserSerializer, RegisterSerializer, ProfileUpdateSerializer, WebAuthnCredentialSerializer
from django.http import HttpResponseRedirect, JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken
import logging
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.views.decorators.csrf import csrf_exempt
import urllib.parse
from django.conf import settings
import base64
import json
from webauthn import generate_registration_options, generate_authentication_options, verify_registration_response, verify_authentication_response
from webauthn.helpers.structs import (
    PublicKeyCredentialRpEntity,
    PublicKeyCredentialUserEntity,
    PublicKeyCredentialDescriptor,
    UserVerificationRequirement,
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    PublicKeyCredentialType
)
# No additional webauthn helpers needed for this version
from django.utils import timezone

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    """View for user registration"""
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        logger.info(f"Registration attempt for username: {request.data.get('username')}")
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            logger.info(f"User registered successfully: {user.username} (ID: {user.id})")
            
            # Generate JWT tokens for immediate login
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            response_data = {
                'user': UserSerializer(user).data,
                'access': access_token,
                'refresh': refresh_token,
                'message': 'Registration successful'
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        else:
            logger.warning(f"Registration failed for username: {request.data.get('username')}. Errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating user profile"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_object(self):
        return self.request.user

class ProfileMetricsUpdateView(generics.UpdateAPIView):
    """View for updating only profile metrics (height, weight, etc.)"""
    serializer_class = ProfileUpdateSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_object(self):
        return self.request.user.profile

    def update(self, request, *args, **kwargs):
        logger.info(f"Profile metrics update request for user: {request.user.username}")
        logger.info(f"Request data: {request.data}")
        return super().update(request, *args, **kwargs)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def social_auth_token(request):
    """Handle social authentication token exchange"""
    try:
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Here you would verify the token with the social provider
        # For now, we'll just return a placeholder response
        return Response({'message': 'Social auth not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)
    
    except Exception as e:
        logger.error(f"Social auth error: {str(e)}")
        return Response({'error': 'Social authentication failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# WebAuthn helper functions
def get_relying_party():
    """Get relying party configuration"""
    origin = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    rp_id = 'localhost' if 'localhost' in origin else origin.replace('https://', '').replace('http://', '')
    
    return PublicKeyCredentialRpEntity(
        id=rp_id,
        name="CalorieTracker"
    )

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def webauthn_register_begin(request):
    """Begin WebAuthn registration process"""
    try:
        user = request.user
        rp = get_relying_party()
        
        # Get existing credentials to exclude them
        existing_credentials = WebAuthnCredential.objects.filter(user=user)
        exclude_credentials = []
        for cred in existing_credentials:
            exclude_credentials.append(
                PublicKeyCredentialDescriptor(
                    id=base64.b64decode(cred.credential_id),
                    type=PublicKeyCredentialType.PUBLIC_KEY
                )
            )
        
        user_entity = PublicKeyCredentialUserEntity(
            id=str(user.id).encode(),
            name=user.username,
            display_name=f"{user.first_name} {user.last_name}".strip() or user.username
        )
        
        options = generate_registration_options(
            rp_id=rp.id,
            rp_name=rp.name,
            user_id=user_entity.id,
            user_name=user_entity.name,
            user_display_name=user_entity.display_name,
            exclude_credentials=exclude_credentials,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                user_verification=UserVerificationRequirement.PREFERRED
            )
        )
        
        # Store challenge in session for verification
        request.session['webauthn_challenge'] = base64.b64encode(options.challenge).decode()
        request.session['webauthn_user_id'] = user.id
        
        # Convert options to JSON-serializable format
        return Response({
            'challenge': base64.b64encode(options.challenge).decode(),
            'rp': {'id': options.rp.id, 'name': options.rp.name},
            'user': {
                'id': base64.b64encode(options.user.id).decode(),
                'name': options.user.name,
                'displayName': options.user.display_name
            },
            'pubKeyCredParams': [{'type': param.type, 'alg': param.alg} for param in options.pub_key_cred_params],
            'timeout': options.timeout,
            'excludeCredentials': [
                {
                    'id': base64.b64encode(cred.id).decode(),
                    'type': cred.type
                }
                for cred in exclude_credentials
            ],
            'authenticatorSelection': {
                'authenticatorAttachment': 'platform',
                'userVerification': 'preferred'
            },
            'attestation': 'none'
        })
        
    except Exception as e:
        logger.error(f"WebAuthn registration begin error: {str(e)}")
        return Response({'error': 'Failed to generate registration options'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def webauthn_register_complete(request):
    """Complete WebAuthn registration process"""
    try:
        user = request.user
        credential_data = request.data
        
        # Get challenge from session
        challenge = request.session.get('webauthn_challenge')
        if not challenge:
            return Response({'error': 'No challenge found in session'}, status=status.HTTP_400_BAD_REQUEST)
        
        rp = get_relying_party()
        origin = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        # Create credential object manually for webauthn 1.11.0
        from webauthn.helpers.structs import RegistrationCredential
        credential = RegistrationCredential(
            id=credential_data['id'],
            raw_id=base64.b64decode(credential_data['rawId']),
            response={
                'client_data_json': base64.b64decode(credential_data['response']['clientDataJSON']),
                'attestation_object': base64.b64decode(credential_data['response']['attestationObject'])
            },
            type=credential_data['type']
        )
        
        # Verify the registration
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=base64.b64decode(challenge),
            expected_origin=origin,
            expected_rp_id=rp.id
        )
        
        # In version 2.6.0, the verification object has different attributes
        if verification.verified:
            # Save the credential
            WebAuthnCredential.objects.create(
                user=user,
                credential_id=base64.b64encode(verification.credential_id).decode(),
                public_key=base64.b64encode(verification.credential_public_key).decode(),
                sign_count=verification.sign_count,
                name=request.data.get('name', f'Passkey {timezone.now().strftime("%m/%d/%Y")}')
            )
            
            # Clear session
            if 'webauthn_challenge' in request.session:
                del request.session['webauthn_challenge']
            
            return Response({'verified': True, 'message': 'Passkey registered successfully'})
        else:
            return Response({'error': 'Registration verification failed'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"WebAuthn registration complete error: {str(e)}")
        return Response({'error': 'Failed to complete registration'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def webauthn_authenticate_begin(request):
    """Begin WebAuthn authentication process"""
    try:
        username = request.data.get('username')
        if not username:
            return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's credentials
        credentials = WebAuthnCredential.objects.filter(user=user)
        if not credentials.exists():
            return Response({'error': 'No passkeys found for this user'}, status=status.HTTP_400_BAD_REQUEST)
        
        rp = get_relying_party()
        
        # Prepare allowed credentials
        allow_credentials = []
        for cred in credentials:
            allow_credentials.append(
                PublicKeyCredentialDescriptor(
                    id=base64.b64decode(cred.credential_id),
                    type=PublicKeyCredentialType.PUBLIC_KEY
                )
            )
        
        options = generate_authentication_options(
            rp_id=rp.id,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.PREFERRED
        )
        
        # Store challenge and user info in session
        request.session['webauthn_challenge'] = base64.b64encode(options.challenge).decode()
        request.session['webauthn_user_id'] = user.id
        
        return Response({
            'challenge': base64.b64encode(options.challenge).decode(),
            'timeout': options.timeout,
            'rpId': options.rp_id,
            'allowCredentials': [
                {
                    'id': base64.b64encode(cred.id).decode(),
                    'type': cred.type
                }
                for cred in allow_credentials
            ],
            'userVerification': 'preferred'
        })
        
    except Exception as e:
        logger.error(f"WebAuthn authentication begin error: {str(e)}")
        return Response({'error': 'Failed to generate authentication options'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def webauthn_authenticate_complete(request):
    """Complete WebAuthn authentication process"""
    try:
        credential_data = request.data
        
        # Get challenge and user from session
        challenge = request.session.get('webauthn_challenge')
        user_id = request.session.get('webauthn_user_id')
        
        if not challenge or not user_id:
            return Response({'error': 'No challenge or user found in session'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the credential
        try:
            credential_record = WebAuthnCredential.objects.get(
                user=user,
                credential_id=credential_data['id']
            )
        except WebAuthnCredential.DoesNotExist:
            return Response({'error': 'Credential not found'}, status=status.HTTP_404_NOT_FOUND)
        
        rp = get_relying_party()
        origin = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        # Create credential object manually for webauthn 1.11.0
        from webauthn.helpers.structs import AuthenticationCredential
        credential = AuthenticationCredential(
            id=credential_data['id'],
            raw_id=base64.b64decode(credential_data['rawId']),
            response={
                'client_data_json': base64.b64decode(credential_data['response']['clientDataJSON']),
                'authenticator_data': base64.b64decode(credential_data['response']['authenticatorData']),
                'signature': base64.b64decode(credential_data['response']['signature']),
                'user_handle': base64.b64decode(credential_data['response']['userHandle']) if credential_data['response'].get('userHandle') else None
            },
            type=credential_data['type']
        )
        
        # Verify the authentication
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=base64.b64decode(challenge),
            expected_origin=origin,
            expected_rp_id=rp.id,
            credential_public_key=credential_record.public_key_bytes,
            credential_current_sign_count=credential_record.sign_count
        )
        
        # In version 2.6.0, the verification object has different attributes
        if verification.verified:
            # Update sign count and last used
            credential_record.sign_count = verification.new_sign_count
            credential_record.last_used = timezone.now()
            credential_record.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Clear session
            if 'webauthn_challenge' in request.session:
                del request.session['webauthn_challenge']
            if 'webauthn_user_id' in request.session:
                del request.session['webauthn_user_id']
            
            return Response({
                'verified': True,
                'access': access_token,
                'refresh': refresh_token
            })
        else:
            return Response({'error': 'Authentication verification failed'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"WebAuthn authentication complete error: {str(e)}")
        return Response({'error': 'Failed to complete authentication'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def webauthn_credentials(request):
    """Get user's WebAuthn credentials"""
    credentials = WebAuthnCredential.objects.filter(user=request.user)
    serializer = WebAuthnCredentialSerializer(credentials, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def webauthn_credential_delete(request, credential_id):
    """Delete a WebAuthn credential"""
    try:
        credential = WebAuthnCredential.objects.get(id=credential_id, user=request.user)
        credential.delete()
        return Response({'message': 'Passkey deleted successfully'})
    except WebAuthnCredential.DoesNotExist:
        return Response({'error': 'Passkey not found'}, status=status.HTTP_404_NOT_FOUND)