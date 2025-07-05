from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class NotificationPreference(models.Model):
    """User notification preferences"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email notification settings
    email_notifications = models.BooleanField(default=True)
    budget_alerts = models.BooleanField(default=True)
    low_balance_alerts = models.BooleanField(default=True)
    new_transaction_alerts = models.BooleanField(default=False)
    weekly_reports = models.BooleanField(default=True)
    monthly_reports = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    marketing_emails = models.BooleanField(default=False)
    
    # Threshold settings
    budget_threshold = models.IntegerField(
        default=90,
        validators=[MinValueValidator(50), MaxValueValidator(100)],
        help_text="Percentage of budget to trigger alert"
    )
    low_balance_threshold = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=100.00,
        validators=[MinValueValidator(0)],
        help_text="Dollar amount to trigger low balance alert"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Notification preferences for {self.user.username}"


class EmailNotification(models.Model):
    """Log of email notifications sent"""
    
    EMAIL_TYPES = [
        ('budget_alert', 'Budget Alert'),
        ('low_balance', 'Low Balance Alert'),
        ('new_transaction', 'New Transaction'),
        ('weekly_report', 'Weekly Report'),
        ('monthly_report', 'Monthly Report'),
        ('security_alert', 'Security Alert'),
        ('welcome', 'Welcome Email'),
        ('password_reset', 'Password Reset'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_notifications')
    
    # Email details
    email_type = models.CharField(max_length=50, choices=EMAIL_TYPES)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=200)
    
    # Sending details
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    
    # Content reference
    template_name = models.CharField(max_length=100, blank=True)
    context_data = models.JSONField(default=dict, blank=True)
    
    # Metadata
    sendgrid_message_id = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['user', 'email_type']),
            models.Index(fields=['sent_at']),
            models.Index(fields=['success']),
        ]
    
    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.email_type} to {self.recipient_email} at {self.sent_at}"


class NotificationQueue(models.Model):
    """Queue for pending notifications"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_queue')
    
    # Notification details
    email_type = models.CharField(max_length=50, choices=EmailNotification.EMAIL_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Scheduling
    scheduled_for = models.DateTimeField(auto_now_add=True)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    
    # Content
    subject = models.CharField(max_length=200)
    template_name = models.CharField(max_length=100)
    context_data = models.JSONField(default=dict)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['priority', 'scheduled_for']
        indexes = [
            models.Index(fields=['status', 'scheduled_for']),
            models.Index(fields=['user', 'email_type']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"{self.email_type} for {self.user.username} ({self.status})" 