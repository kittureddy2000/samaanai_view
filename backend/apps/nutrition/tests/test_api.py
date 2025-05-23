import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.nutrition.models import MealEntry, ExerciseEntry, WeightEntry
from apps.users.models import UserProfile
from datetime import date

@pytest.fixture
def user():
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpassword'
    )
    # Create user profile with test data, using get_or_create to avoid duplicates
    UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'height': 180,
            'weight': 75,
            'date_of_birth': date(1990, 1, 1),
            'metabolic_rate': 2000,
            'weight_loss_goal': -0.5,
            'start_of_week': 2  # Wednesday
        }
    )
    return user

@pytest.fixture
def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
class TestMealEntryAPI:
    def test_create_meal_entry(self, authenticated_client, user):
        url = reverse('mealentry-list')
        data = {
            'meal_type': 'breakfast',
            'description': 'Test Breakfast',
            'calories': 300,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 201
        assert MealEntry.objects.count() == 1
        assert MealEntry.objects.get().calories == 300
    
    def test_get_meal_entries(self, authenticated_client, user):
        # Create test entries
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Test Breakfast',
            calories=300
        )
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='lunch',
            description='Test Lunch',
            calories=500
        )
        
        # Test API response
        url = reverse('mealentry-list')
        response = authenticated_client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 2

@pytest.mark.django_db
class TestDailyReportAPI:
    def test_daily_report_empty(self, authenticated_client, user):
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['total_food_calories'] == 0
        assert response.data['total_exercise_calories'] == 0
    
    def test_daily_report_with_data(self, authenticated_client, user):
        # Create meal and exercise entries
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Test Breakfast',
            calories=300
        )
        ExerciseEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            description='Running',
            calories_burned=500,
            duration_minutes=45
        )
        
        # Test API response
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['total_food_calories'] == 300
        assert response.data['total_exercise_calories'] == 500
        assert len(response.data['meals']) == 1
        assert len(response.data['exercises']) == 1

@pytest.mark.django_db
class TestWeeklyReportAPI:
    def test_weekly_report(self, authenticated_client, user):
        # Create entries for multiple days in a week
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),  # Monday
            meal_type='breakfast', 
            description='Monday Breakfast',
            calories=300
        )
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 2),  # Tuesday
            meal_type='lunch',
            description='Tuesday Lunch',
            calories=400
        )
        ExerciseEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),  # Monday
            description='Running',
            calories_burned=200,
            duration_minutes=30
        )
        
        # Test API response
        url = reverse('weekly-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert len(response.data['daily_summaries']) == 7  # Full week
        assert response.data['overall_total_food_calories'] == 700
        assert response.data['overall_total_exercise_calories'] == 200
