import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.nutrition.models import MealEntry, ExerciseEntry, WeightEntry
from apps.users.models import UserProfile
from datetime import date, datetime
import json

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

    def test_update_meal_entry(self, authenticated_client, user):
        # Create initial entry
        meal = MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Original Breakfast',
            calories=300
        )
        
        # Update the entry
        url = reverse('mealentry-detail', kwargs={'pk': meal.pk})
        data = {
            'meal_type': 'breakfast',
            'description': 'Updated Breakfast',
            'calories': 350,
            'date': '2023-05-01'
        }
        response = authenticated_client.put(url, data, format='json')
        assert response.status_code == 200
        
        # Verify update
        meal.refresh_from_db()
        assert meal.description == 'Updated Breakfast'
        assert meal.calories == 350

    def test_delete_meal_entry(self, authenticated_client, user):
        # Create entry to delete
        meal = MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Test Breakfast',
            calories=300
        )
        
        url = reverse('mealentry-detail', kwargs={'pk': meal.pk})
        response = authenticated_client.delete(url)
        assert response.status_code == 204
        assert MealEntry.objects.count() == 0

    def test_meal_entry_user_isolation(self, authenticated_client, user):
        # Create another user and their meal entry
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='password'
        )
        MealEntry.objects.create(
            user=other_user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Other User Breakfast',
            calories=400
        )
        
        # Current user should not see other user's entries
        url = reverse('mealentry-list')
        response = authenticated_client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 0

@pytest.mark.django_db
class TestExerciseEntryAPI:
    def test_create_exercise_entry(self, authenticated_client, user):
        url = reverse('exerciseentry-list')
        data = {
            'description': 'Running',
            'calories_burned': 300,
            'duration_minutes': 30,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 201
        assert ExerciseEntry.objects.count() == 1
        assert ExerciseEntry.objects.get().calories_burned == 300

    def test_update_exercise_entry(self, authenticated_client, user):
        # Create initial entry
        exercise = ExerciseEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            description='Running',
            calories_burned=300,
            duration_minutes=30
        )
        
        # Update the entry
        url = reverse('exerciseentry-detail', kwargs={'pk': exercise.pk})
        data = {
            'description': 'Cycling',
            'calories_burned': 400,
            'duration_minutes': 45,
            'date': '2023-05-01'
        }
        response = authenticated_client.put(url, data, format='json')
        assert response.status_code == 200
        
        # Verify update
        exercise.refresh_from_db()
        assert exercise.description == 'Cycling'
        assert exercise.calories_burned == 400

@pytest.mark.django_db
class TestWeightEntryAPI:
    def test_create_weight_entry(self, authenticated_client, user):
        url = reverse('weightentry-list')
        data = {
            'weight': 75.5,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 201
        assert WeightEntry.objects.count() == 1
        assert WeightEntry.objects.get().weight == 75.5

    def test_get_weight_history(self, authenticated_client, user):
        # Create multiple weight entries
        WeightEntry.objects.create(user=user, date=date(2023, 5, 1), weight=75.0)
        WeightEntry.objects.create(user=user, date=date(2023, 5, 2), weight=74.8)
        WeightEntry.objects.create(user=user, date=date(2023, 5, 3), weight=74.5)
        
        url = reverse('weightentry-list')
        response = authenticated_client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 3
        
        # Should be ordered by date (most recent first)
        weights = [entry['weight'] for entry in response.data]
        assert weights == [74.5, 74.8, 75.0]

@pytest.mark.django_db
class TestDailyReportAPI:
    def test_daily_report_empty(self, authenticated_client, user):
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['total_food_calories'] == 0
        assert response.data['total_exercise_calories'] == 0
        assert response.data['net_calories'] == 0
        assert response.data['date'] == '2023-05-01'
    
    def test_daily_report_with_data(self, authenticated_client, user):
        # Create meal and exercise entries
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
        ExerciseEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            description='Running',
            calories_burned=400,
            duration_minutes=45
        )
        
        # Test API response
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['total_food_calories'] == 800
        assert response.data['total_exercise_calories'] == 400
        assert response.data['net_calories'] == 400
        assert len(response.data['meals']) == 2
        assert len(response.data['exercises']) == 1

    def test_daily_report_date_filtering(self, authenticated_client, user):
        # Create entries for different dates
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='May 1st Breakfast',
            calories=300
        )
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 2),
            meal_type='breakfast',
            description='May 2nd Breakfast',
            calories=400
        )
        
        # Request specific date
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['total_food_calories'] == 300
        assert len(response.data['meals']) == 1
        assert response.data['meals'][0]['description'] == 'May 1st Breakfast'

    def test_daily_report_missing_date_parameter(self, authenticated_client, user):
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(url)
        assert response.status_code == 400
        assert 'Date parameter is required' in response.data['error']

    def test_daily_report_invalid_date_format(self, authenticated_client, user):
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=invalid-date")
        assert response.status_code == 400
        assert 'Invalid date format' in response.data['error']

@pytest.mark.django_db
class TestWeeklyReportAPI:
    def test_weekly_report_empty(self, authenticated_client, user):
        url = reverse('weekly-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['overall_total_food_calories'] == 0
        assert response.data['overall_total_exercise_calories'] == 0
        assert len(response.data['daily_summaries']) == 7  # Full week

    def test_weekly_report_with_data(self, authenticated_client, user):
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
        
        # Check specific days have correct data
        daily_summaries = {summary['date']: summary for summary in response.data['daily_summaries']}
        assert daily_summaries['2023-05-01']['total_food_calories'] == 300
        assert daily_summaries['2023-05-01']['total_exercise_calories'] == 200
        assert daily_summaries['2023-05-02']['total_food_calories'] == 400
        assert daily_summaries['2023-05-02']['total_exercise_calories'] == 0

    def test_weekly_report_respects_user_start_of_week(self, authenticated_client, user):
        # Update user's start of week preference
        profile = user.profile
        profile.start_of_week = 0  # Monday
        profile.save()
        
        url = reverse('weekly-report')
        response = authenticated_client.get(f"{url}?date=2023-05-03")  # Wednesday
        assert response.status_code == 200
        
        # Week should start on Monday (2023-05-01) and end on Sunday (2023-05-07)
        assert response.data['start_date'] == '2023-05-01'
        assert response.data['end_date'] == '2023-05-07'

@pytest.mark.django_db
class TestMonthlyReportAPI:
    def test_monthly_report_empty(self, authenticated_client, user):
        url = reverse('monthly-report')
        response = authenticated_client.get(f"{url}?month=5&year=2023")
        assert response.status_code == 200
        assert response.data['month'] == 5
        assert response.data['year'] == 2023
        assert len(response.data['weekly_summaries']) > 0  # Should have weeks even if empty

    def test_monthly_report_with_data(self, authenticated_client, user):
        # Create entries throughout the month
        for day in range(1, 32, 7):  # Every week
            if day <= 31:  # Valid day
                MealEntry.objects.create(
                    user=user,
                    date=date(2023, 5, day),
                    meal_type='breakfast',
                    description=f'Day {day} Breakfast',
                    calories=300
                )
        
        url = reverse('monthly-report')
        response = authenticated_client.get(f"{url}?month=5&year=2023")
        assert response.status_code == 200
        assert response.data['month'] == 5
        assert response.data['year'] == 2023
        
        # Should have weekly summaries with data
        weekly_summaries = response.data['weekly_summaries']
        assert len(weekly_summaries) > 0
        
        # At least some weeks should have food calories
        total_calories = sum(week['total_food_calories'] for week in weekly_summaries)
        assert total_calories > 0

    def test_monthly_report_missing_parameters(self, authenticated_client, user):
        url = reverse('monthly-report')
        
        # Missing month
        response = authenticated_client.get(f"{url}?year=2023")
        assert response.status_code == 400
        
        # Missing year
        response = authenticated_client.get(f"{url}?month=5")
        assert response.status_code == 400

@pytest.mark.django_db
class TestAuthenticationAndPermissions:
    def test_unauthenticated_access_denied(self):
        client = APIClient()
        
        # Test meal entries
        url = reverse('mealentry-list')
        response = client.get(url)
        assert response.status_code == 401
        
        # Test daily report
        url = reverse('daily-nutrition-report')
        response = client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 401

    def test_user_can_only_access_own_data(self, authenticated_client, user):
        # Create another user with data
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='password'
        )
        MealEntry.objects.create(
            user=other_user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Other User Meal',
            calories=500
        )
        
        # Current user should not see other user's data
        url = reverse('mealentry-list')
        response = authenticated_client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 0
        
        # Daily report should not include other user's data
        url = reverse('daily-nutrition-report')
        response = authenticated_client.get(f"{url}?date=2023-05-01")
        assert response.status_code == 200
        assert response.data['total_food_calories'] == 0

@pytest.mark.django_db
class TestDataValidation:
    def test_meal_entry_validation(self, authenticated_client, user):
        url = reverse('mealentry-list')
        
        # Test invalid meal type
        data = {
            'meal_type': 'invalid_meal',
            'description': 'Test',
            'calories': 300,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 400
        
        # Test negative calories
        data = {
            'meal_type': 'breakfast',
            'description': 'Test',
            'calories': -100,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 400

    def test_exercise_entry_validation(self, authenticated_client, user):
        url = reverse('exerciseentry-list')
        
        # Test negative calories burned
        data = {
            'description': 'Running',
            'calories_burned': -100,
            'duration_minutes': 30,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 400
        
        # Test negative duration
        data = {
            'description': 'Running',
            'calories_burned': 300,
            'duration_minutes': -30,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 400

    def test_weight_entry_validation(self, authenticated_client, user):
        url = reverse('weightentry-list')
        
        # Test negative weight
        data = {
            'weight': -50,
            'date': '2023-05-01'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == 400
