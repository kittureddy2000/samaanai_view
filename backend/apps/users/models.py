from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
import pytz
import base64

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
    
    # Common timezone choices
    TIMEZONE_CHOICES = [
        ('US/Pacific', 'Pacific Time (PT)'),
        ('US/Mountain', 'Mountain Time (MT)'),
        ('US/Central', 'Central Time (CT)'),
        ('US/Eastern', 'Eastern Time (ET)'),
        ('UTC', 'UTC'),
        ('Europe/London', 'London'),
        ('Europe/Paris', 'Paris'),
        ('Asia/Tokyo', 'Tokyo'),
        ('Australia/Sydney', 'Sydney'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Add custom fields for user profile
    height = models.FloatField(null=True, blank=True, help_text="Height in cm")
    weight = models.FloatField(null=True, blank=True, help_text="Weight in lbs")
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Timezone preference
    timezone = models.CharField(
        max_length=50,
        choices=TIMEZONE_CHOICES,
        default='US/Pacific',
        help_text="Your local timezone"
    )
    
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
    
    def get_user_timezone(self):
        """Get the user's timezone as a pytz timezone object"""
        return pytz.timezone(self.timezone)
    
    def get_current_date(self):
        """Get the current date in the user's timezone"""
        from django.utils import timezone as django_timezone
        user_tz = self.get_user_timezone()
        now = django_timezone.now().astimezone(user_tz)
        return now.date()
    
    def __str__(self):
        return f"{self.user.username}'s profile"

class WebAuthnCredential(models.Model):
    """Model to store WebAuthn credentials (passkeys) for users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webauthn_credentials')
    credential_id = models.TextField(help_text="Base64-encoded credential ID")
    public_key = models.TextField(help_text="Base64-encoded public key")
    sign_count = models.PositiveIntegerField(default=0, help_text="Signature counter")
    name = models.CharField(max_length=255, help_text="User-friendly name for the credential")
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'credential_id']
    
    @property
    def public_key_bytes(self):
        """Return the public key as bytes for WebAuthn verification"""
        return base64.b64decode(self.public_key)
    
    def __str__(self):
        return f"{self.user.username} - {self.name}"
    
    @property
    def credential_id_bytes(self):
        """Get credential ID as bytes"""
        return base64.b64decode(self.credential_id)
    
    @property
    def public_key_bytes(self):
        """Get public key as bytes"""
        return base64.b64decode(self.public_key)

# Automatically create/update UserProfile when User is created/updated
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)