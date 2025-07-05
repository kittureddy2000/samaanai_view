from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import date

def get_current_date():
    """Get current date without timezone conversion issues"""
    return date.today()

def get_user_current_date(user=None):
    """Get current date in user's timezone if available, otherwise server local date"""
    if user and hasattr(user, 'profile') and user.profile:
        try:
            return user.profile.get_current_date()
        except:
            pass
    return date.today()

class WeightEntry(models.Model):
    """Model for daily weight tracking"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='weight_entries'
    )
    date = models.DateField(default=get_current_date)
    weight = models.FloatField(help_text="Weight in kg")

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.weight}kg"

class MealEntry(models.Model):
    """Model for individual meal entries"""
    MEAL_TYPES = (
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snacks', 'Snacks'),
    )
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='meal_entries',
        null=True # Allow null temporarily for migration
    )
    date = models.DateField(default=get_current_date)
    meal_type = models.CharField(max_length=10, choices=MEAL_TYPES)
    description = models.CharField(max_length=255) # Consider making this optional or pre-filled
    calories = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Optional: if you want to prevent multiple 'breakfast' entries for the same user on the same day
        unique_together = ['user', 'date', 'meal_type'] 
        ordering = ['-date', 'created_at']

    def __str__(self):
        # Handle case where user might be null during transition
        user_str = self.user.username if self.user else "[No User]"
        return f"{user_str} - {self.date} - {self.get_meal_type_display()} - {self.calories} cal"


class ExerciseEntry(models.Model):
    """Model for exercise entries"""
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='exercise_entries',
        null=True # Allow null temporarily for migration
    )
    date = models.DateField(default=get_current_date)
    description = models.CharField(max_length=255)
    calories_burned = models.PositiveIntegerField()
    duration_minutes = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date', 'created_at']
    
    def __str__(self):
        # Handle case where user might be null during transition
        user_str = self.user.username if self.user else "[No User]"
        return f"{user_str} - {self.date} - Exercise: {self.description} - {self.calories_burned} cal"

# Ensure the duplicate update_total_calories function that was outside any class is removed.
# The old DailyEntry model and its methods (calculate_net_calories, update_total_calories) are removed.    