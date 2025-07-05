from django.contrib import admin
from .models import NotificationPreference, EmailNotification, NotificationQueue


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'email_notifications', 'budget_alerts', 'low_balance_alerts',
        'budget_threshold', 'low_balance_threshold', 'updated_at'
    ]
    list_filter = [
        'email_notifications', 'budget_alerts', 'low_balance_alerts',
        'weekly_reports', 'monthly_reports', 'security_alerts'
    ]
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Email Settings', {
            'fields': (
                'email_notifications',
                'budget_alerts',
                'low_balance_alerts',
                'new_transaction_alerts',
                'weekly_reports',
                'monthly_reports',
                'security_alerts',
                'marketing_emails'
            )
        }),
        ('Thresholds', {
            'fields': ('budget_threshold', 'low_balance_threshold')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(EmailNotification)
class EmailNotificationAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'email_type', 'recipient_email', 'subject',
        'success', 'sent_at'
    ]
    list_filter = [
        'email_type', 'success', 'sent_at'
    ]
    search_fields = [
        'user__username', 'user__email', 'recipient_email',
        'subject', 'template_name'
    ]
    readonly_fields = [
        'id', 'user', 'email_type', 'recipient_email', 'subject',
        'sent_at', 'success', 'error_message', 'template_name',
        'context_data', 'sendgrid_message_id'
    ]
    
    date_hierarchy = 'sent_at'
    
    def has_add_permission(self, request):
        return False  # Don't allow manual creation
    
    def has_change_permission(self, request, obj=None):
        return False  # Don't allow editing


@admin.register(NotificationQueue)
class NotificationQueueAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'email_type', 'priority', 'status',
        'scheduled_for', 'attempts', 'created_at'
    ]
    list_filter = [
        'email_type', 'priority', 'status', 'scheduled_for'
    ]
    search_fields = [
        'user__username', 'user__email', 'subject', 'template_name'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'last_attempt_at'
    ]
    
    fieldsets = (
        ('User & Type', {
            'fields': ('user', 'email_type', 'priority', 'status')
        }),
        ('Scheduling', {
            'fields': (
                'scheduled_for', 'attempts', 'max_attempts',
                'last_attempt_at'
            )
        }),
        ('Content', {
            'fields': ('subject', 'template_name', 'context_data')
        }),
        ('Error Info', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['retry_failed_notifications']
    
    def retry_failed_notifications(self, request, queryset):
        """Action to retry failed notifications"""
        failed_notifications = queryset.filter(status='failed')
        count = 0
        
        for notification in failed_notifications:
            if notification.attempts < notification.max_attempts:
                notification.status = 'pending'
                notification.error_message = ''
                notification.save()
                count += 1
        
        self.message_user(
            request,
            f"Successfully reset {count} failed notifications to pending status."
        )
    
    retry_failed_notifications.short_description = "Retry selected failed notifications" 