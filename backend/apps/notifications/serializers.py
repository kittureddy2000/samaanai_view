from rest_framework import serializers
from .models import NotificationPreference, EmailNotification, NotificationQueue


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'email_notifications',
            'budget_alerts',
            'low_balance_alerts',
            'new_transaction_alerts',
            'weekly_reports',
            'monthly_reports',
            'security_alerts',
            'marketing_emails',
            'budget_threshold',
            'low_balance_threshold',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_budget_threshold(self, value):
        """Validate budget threshold is between 50-100"""
        if value < 50 or value > 100:
            raise serializers.ValidationError("Budget threshold must be between 50 and 100 percent")
        return value
    
    def validate_low_balance_threshold(self, value):
        """Validate low balance threshold is positive"""
        if value < 0:
            raise serializers.ValidationError("Low balance threshold must be positive")
        return value


class EmailNotificationSerializer(serializers.ModelSerializer):
    """Serializer for email notification logs"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = EmailNotification
        fields = [
            'id',
            'user_email',
            'user_name',
            'email_type',
            'recipient_email',
            'subject',
            'sent_at',
            'success',
            'error_message',
            'template_name',
            'sendgrid_message_id'
        ]
        read_only_fields = ['id', 'sent_at', 'user_email', 'user_name']


class NotificationQueueSerializer(serializers.ModelSerializer):
    """Serializer for notification queue"""
    
    class Meta:
        model = NotificationQueue
        fields = [
            'id',
            'email_type',
            'priority',
            'status',
            'scheduled_for',
            'attempts',
            'max_attempts',
            'subject',
            'created_at',
            'updated_at',
            'last_attempt_at',
            'error_message'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_attempt_at', 'attempts'
        ]


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    total_sent = serializers.IntegerField()
    success_rate = serializers.FloatField()
    recent_notifications = EmailNotificationSerializer(many=True)
    pending_notifications = serializers.IntegerField()
    
    # Stats by type
    budget_alerts_sent = serializers.IntegerField()
    low_balance_alerts_sent = serializers.IntegerField()
    weekly_reports_sent = serializers.IntegerField()
    monthly_reports_sent = serializers.IntegerField() 