from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    # Day of week choices (Django's weekday, Monday=0, Sunday=6)
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6
    
    DAY_OF_WEEK_CHOICES = [
        (MONDAY, 'Monday'),
        (TUESDAY, 'Tuesday'),
        (WEDNESDAY, 'Wednesday'),
        (THURSDAY, 'Thursday'),
        (FRIDAY, 'Friday'),
        (SATURDAY, 'Saturday'),
        (SUNDAY, 'Sunday'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Add custom fields for user profile
    height = models.FloatField(null=True, blank=True, help_text="Height in cm")
    weight = models.FloatField(null=True, blank=True, help_text="Weight in lbs")
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Start of week preference (default is Wednesday)
    start_of_week = models.IntegerField(
        choices=DAY_OF_WEEK_CHOICES,
        default=WEDNESDAY,
        help_text="Preferred day to start the week"
    )
    
    # Metabolic rate (BMR) in calories
    metabolic_rate = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Basal Metabolic Rate in calories per day"
    )
    
    # Weight loss goal in pounds per week (can be negative for weight gain)
    weight_loss_goal = models.FloatField(
        default=0,
        validators=[
            MinValueValidator(-2.0),  # Maximum 2 lbs weight gain per week
            MaxValueValidator(2.0)    # Maximum 2 lbs weight loss per week
        ],
        help_text="Target weight change in pounds per week (negative for gain, positive for loss)"
    )
    
    def __str__(self):
        return f"{self.user.username}'s profile"

# Automatically create/update UserProfile when User is created/updated
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)