import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.users.models import UserProfile
from datetime import date

@pytest.fixture
def user():
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpassword'
    )
    return user

@pytest.fixture
def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
class TestUserProfile:
    def test_profile_creation(self, user):
        # Create a fresh profile instead of get_or_create to ensure we're testing creation
        # Delete any existing profile first
        UserProfile.objects.filter(user=user).delete()
        
        profile = UserProfile.objects.create(
            user=user,
            height=180,
            weight=75,
            date_of_birth=date(1990, 1, 1),
            metabolic_rate=2000,
            weight_loss_goal=-0.5,
            start_of_week=2  # Wednesday
        )
        
        assert profile.height == 180
        assert profile.weight == 75
        assert profile.metabolic_rate == 2000
        assert profile.start_of_week == 2
    
    def test_profile_update_api(self, authenticated_client, user):
        # Create initial profile
        # Delete any existing profile first
        UserProfile.objects.filter(user=user).delete()
        
        profile = UserProfile.objects.create(
            user=user,
            height=180,
            weight=75,
            date_of_birth=date(1990, 1, 1),
            metabolic_rate=2000,
            weight_loss_goal=-0.5,
            start_of_week=2  # Wednesday
        )
        
        # Update profile data - needs to be nested under 'profile' key
        url = reverse('profile')
        data = {
            'username': user.username,  # Required field
            'email': user.email,        # Include other User model fields
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile': {
                'height': 182,
                'weight': 73,
                'date_of_birth': '1990-01-01',
                'metabolic_rate': 2100,
                'weight_loss_goal': -0.7,
                'start_of_week': 1  # Tuesday
            }
        }
        
        response = authenticated_client.put(url, data, format='json')
        assert response.status_code == 200
        
        # Verify updates were applied
        profile = UserProfile.objects.get(user=user)
        assert profile.height == 182
        assert profile.weight == 73
        assert profile.metabolic_rate == 2100
        assert profile.weight_loss_goal == -0.7
        assert profile.start_of_week == 1
