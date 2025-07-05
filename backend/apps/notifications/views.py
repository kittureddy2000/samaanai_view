from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.conf import settings
from django.db import transaction

from .models import NotificationPreference, EmailNotification, NotificationQueue
from .serializers import (
    NotificationPreferenceSerializer,
    EmailNotificationSerializer,
    NotificationQueueSerializer,
    NotificationStatsSerializer
)
from .services import NotificationService, BudgetMonitoringService


class NotificationPreferenceView(APIView):
    """API view for managing user notification preferences"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's notification preferences"""
        try:
            notification_service = NotificationService()
            preferences = notification_service.get_user_preferences(request.user)
            serializer = NotificationPreferenceSerializer(preferences)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Failed to get notification preferences: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Update user's notification preferences"""
        try:
            notification_service = NotificationService()
            preferences = notification_service.get_user_preferences(request.user)
            
            serializer = NotificationPreferenceSerializer(
                preferences, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                with transaction.atomic():
                    serializer.save()
                    
                    # Apply the new settings
                    self._apply_preferences(request.user, serializer.data)
                    
                return Response({
                    'success': True,
                    'message': 'Notification preferences updated successfully',
                    'data': serializer.data
                })
            else:
                return Response(
                    {'error': 'Invalid data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to update notification preferences: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _apply_preferences(self, user, preferences_data):
        """Apply notification preferences changes"""
        # Update any global settings or trigger services based on new preferences
        pass


class EmailNotificationHistoryView(APIView):
    """API view for viewing email notification history"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's email notification history"""
        try:
            page_size = min(int(request.GET.get('page_size', 20)), 100)
            page = int(request.GET.get('page', 1))
            email_type = request.GET.get('type')
            
            notifications = EmailNotification.objects.filter(user=request.user)
            
            if email_type:
                notifications = notifications.filter(email_type=email_type)
            
            # Pagination
            start = (page - 1) * page_size
            end = start + page_size
            notifications_page = notifications[start:end]
            
            serializer = EmailNotificationSerializer(notifications_page, many=True)
            
            return Response({
                'results': serializer.data,
                'total': notifications.count(),
                'page': page,
                'page_size': page_size,
                'has_next': notifications.count() > end
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get notification history: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationStatsView(APIView):
    """API view for notification statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get notification statistics for the user"""
        try:
            notification_service = NotificationService()
            stats = notification_service.get_notification_stats(request.user)
            
            # Convert recent_notifications to serialized data
            stats['recent_notifications'] = EmailNotificationSerializer(
                stats['recent_notifications'], many=True
            ).data
            
            serializer = NotificationStatsSerializer(stats)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get notification stats: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_test_notification(request):
    """Send a test notification to the user"""
    try:
        notification_service = NotificationService()
        success = notification_service.send_test_notification(request.user)
        
        if success:
            return Response({
                'success': True,
                'message': 'Test notification sent successfully! Check your email.'
            })
        else:
            return Response({
                'success': False,
                'message': 'Failed to send test notification. Please check your email settings.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Failed to send test notification: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def trigger_budget_check(request):
    """Manually trigger budget alerts check"""
    try:
        monitoring_service = BudgetMonitoringService()
        alerts_sent = monitoring_service.check_budget_alerts(request.user)
        
        return Response({
            'success': True,
            'message': f'Budget check completed. {sum(alerts_sent)} alerts sent.',
            'alerts_sent': len([alert for alert in alerts_sent if alert])
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to check budgets: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def trigger_balance_check(request):
    """Manually trigger balance alerts check"""
    try:
        monitoring_service = BudgetMonitoringService()
        alerts_sent = monitoring_service.check_balance_alerts(request.user)
        
        return Response({
            'success': True,
            'message': f'Balance check completed. {sum(alerts_sent)} alerts sent.',
            'alerts_sent': len([alert for alert in alerts_sent if alert])
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to check balances: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class NotificationQueueView(APIView):
    """API view for managing notification queue"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get pending notifications for the user"""
        try:
            queue_items = NotificationQueue.objects.filter(
                user=request.user,
                status__in=['pending', 'processing']
            ).order_by('priority', 'scheduled_for')
            
            serializer = NotificationQueueSerializer(queue_items, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get notification queue: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notification_settings_status(request):
    """Get the status of notification settings and email configuration"""
    try:
        # Check if SendGrid is configured
        sendgrid_configured = hasattr(settings, 'SENDGRID_API_KEY') and settings.SENDGRID_API_KEY
        
        # Check if email backend is configured
        email_backend_configured = hasattr(settings, 'EMAIL_BACKEND') and settings.EMAIL_BACKEND
        
        # Check user preferences
        notification_service = NotificationService()
        preferences = notification_service.get_user_preferences(request.user)
        
        return Response({
            'sendgrid_configured': sendgrid_configured,
            'email_backend_configured': email_backend_configured,
            'user_email_notifications': preferences.email_notifications,
            'configuration_complete': sendgrid_configured and email_backend_configured,
            'default_from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourapp.com'),
            'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get notification status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )