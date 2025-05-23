from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
import logging

# Set up logger
logger = logging.getLogger(__name__)

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile data"""
    class Meta:
        model = UserProfile
        fields = ['height', 'weight', 'date_of_birth', 'metabolic_rate', 'weight_loss_goal', 'start_of_week']

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data including profile"""
    profile = UserProfileSerializer()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id']
    
    def update(self, instance, validated_data):
        logger.info(f"Updating user: {instance.username}")
        profile_data = validated_data.pop('profile', {})
        # Update User fields
        for attr, value in validated_data.items():
            logger.debug(f"Setting user attribute: {attr} = {value}")
            setattr(instance, attr, value)
        instance.save()
        
        # Update Profile fields
        profile = instance.profile
        for attr, value in profile_data.items():
            logger.debug(f"Setting profile attribute: {attr} = {value}")
            setattr(profile, attr, value)
        profile.save()
        
        logger.info(f"User {instance.username} updated successfully")
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'first_name', 'last_name']

    def validate(self, attrs):
        logger.debug(f"Validating registration data for username: {attrs.get('username')}")
        if attrs['password'] != attrs['password2']:
            logger.warning(f"Password mismatch during registration for user: {attrs.get('username')}")
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        logger.debug("Registration data validation successful")
        return attrs

    def create(self, validated_data):
        logger.info(f"Creating new user: {validated_data['username']}")
        validated_data.pop('password2')
        
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        user.set_password(validated_data['password'])
        user.save()
        
        logger.info(f"User {user.username} created successfully with ID: {user.id}")
        return user

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile metrics only"""
    class Meta:
        model = UserProfile
        fields = ['height', 'weight', 'date_of_birth', 'metabolic_rate', 'weight_loss_goal', 'start_of_week']
        
    def update(self, instance, validated_data):
        logger.info(f"Updating profile metrics for user: {instance.user.username}")
        for attr, value in validated_data.items():
            logger.debug(f"Setting profile metric: {attr} = {value}")
            setattr(instance, attr, value)
        instance.save()
        logger.info(f"Profile metrics updated successfully for user: {instance.user.username}")
        return instance