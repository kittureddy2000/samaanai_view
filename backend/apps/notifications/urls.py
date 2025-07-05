from django.urls import path
from . import views

urlpatterns = [
    # Notification preferences
    path('preferences/', views.NotificationPreferenceView.as_view(), name='notification_preferences'),
    
    # Email history and stats
    path('history/', views.EmailNotificationHistoryView.as_view(), name='notification_history'),
    path('stats/', views.NotificationStatsView.as_view(), name='notification_stats'),
    
    # Test and trigger functions
    path('test/', views.send_test_notification, name='send_test_notification'),
    path('budget-check/', views.trigger_budget_check, name='trigger_budget_check'),
    path('balance-check/', views.trigger_balance_check, name='trigger_balance_check'),
    
    # Queue management
    path('queue/', views.NotificationQueueView.as_view(), name='notification_queue'),
    
    # System status
    path('status/', views.notification_settings_status, name='notification_status'),
] 