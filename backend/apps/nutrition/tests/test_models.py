import pytest
from django.contrib.auth.models import User
from apps.nutrition.models import MealEntry, ExerciseEntry, WeightEntry
from datetime import date

@pytest.fixture
def user():
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpassword'
    )

@pytest.mark.django_db
class TestMealEntry:
    def test_meal_entry_creation(self, user):
        meal = MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Test Breakfast',
            calories=300
        )
        assert meal.calories == 300
        assert meal.meal_type == 'breakfast'
        assert meal.user == user
    
    def test_meal_entry_string_representation(self, user):
        meal = MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='Test Breakfast',
            calories=300
        )
        assert str(meal) == f"{user.username} - 2023-05-01 - Breakfast - 300 cal"
    
    def test_unique_constraint(self, user):
        # Create first entry
        MealEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            meal_type='breakfast',
            description='First Breakfast',
            calories=300
        )
        
        # Try to create another with same user, date, meal_type
        with pytest.raises(Exception):  # Should fail due to unique_together constraint
            MealEntry.objects.create(
                user=user,
                date=date(2023, 5, 1),
                meal_type='breakfast',
                description='Second Breakfast',
                calories=400
            )

@pytest.mark.django_db
class TestExerciseEntry:
    def test_exercise_entry_creation(self, user):
        exercise = ExerciseEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            description='Running',
            calories_burned=500,
            duration_minutes=45
        )
        assert exercise.calories_burned == 500
        assert exercise.duration_minutes == 45
        assert exercise.user == user
    
    def test_unique_constraint(self, user):
        # Create first entry
        ExerciseEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            description='Running',
            calories_burned=500,
            duration_minutes=45
        )
        
        # Try to create another with same user, date
        with pytest.raises(Exception):  # Should fail due to unique_together constraint
            ExerciseEntry.objects.create(
                user=user,
                date=date(2023, 5, 1),
                description='Cycling',
                calories_burned=300,
                duration_minutes=30
            )

@pytest.mark.django_db
class TestWeightEntry:
    def test_weight_entry_creation(self, user):
        weight = WeightEntry.objects.create(
            user=user,
            date=date(2023, 5, 1),
            weight=75.5
        )
        assert weight.weight == 75.5
        assert weight.user == user
