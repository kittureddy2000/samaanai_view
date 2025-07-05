import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.auth.models import User

from .models import NotificationPreference, EmailNotification, NotificationQueue

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing email notifications"""
    
    def __init__(self):
        self.default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourapp.com')
    
    def get_user_preferences(self, user: User) -> NotificationPreference:
        """Get or create user notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={
                'email_notifications': True,
                'budget_alerts': True,
                'low_balance_alerts': True,
                'new_transaction_alerts': False,
                'weekly_reports': True,
                'monthly_reports': True,
                'security_alerts': True,
                'marketing_emails': False,
                'budget_threshold': 90,
                'low_balance_threshold': Decimal('100.00')
            }
        )
        return preferences
    
    def should_send_notification(self, user: User, notification_type: str) -> bool:
        """Check if notification should be sent based on user preferences"""
        preferences = self.get_user_preferences(user)
        
        if not preferences.email_notifications:
            return False
        
        type_mapping = {
            'budget_alert': preferences.budget_alerts,
            'low_balance': preferences.low_balance_alerts,
            'new_transaction': preferences.new_transaction_alerts,
            'weekly_report': preferences.weekly_reports,
            'monthly_report': preferences.monthly_reports,
            'security_alert': preferences.security_alerts,
            'welcome': True,  # Always send welcome emails
            'password_reset': True,  # Always send password reset emails
        }
        
        return type_mapping.get(notification_type, False)
    
    def send_email(
        self,
        user: User,
        email_type: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        priority: str = 'normal',
        recipient_email: Optional[str] = None
    ) -> bool:
        """Send an email notification"""
        
        if not self.should_send_notification(user, email_type):
            logger.info(f"Skipping {email_type} notification for {user.username} - disabled in preferences")
            return False
        
        recipient = recipient_email or user.email
        
        if not recipient:
            logger.error(f"No email address for user {user.username}")
            return False
        
        try:
            # Render email content
            html_content = render_to_string(template_name, context)
            
            # Send email
            send_mail(
                subject=subject,
                message='',  # Plain text version (optional)
                html_message=html_content,
                from_email=self.default_from_email,
                recipient_list=[recipient],
                fail_silently=False,
            )
            
            # Log successful send
            EmailNotification.objects.create(
                user=user,
                email_type=email_type,
                recipient_email=recipient,
                subject=subject,
                success=True,
                template_name=template_name,
                context_data=context
            )
            
            logger.info(f"Successfully sent {email_type} email to {recipient}")
            return True
            
        except Exception as e:
            # Log failed send
            EmailNotification.objects.create(
                user=user,
                email_type=email_type,
                recipient_email=recipient,
                subject=subject,
                success=False,
                error_message=str(e),
                template_name=template_name,
                context_data=context
            )
            
            logger.error(f"Failed to send {email_type} email to {recipient}: {str(e)}")
            return False
    
    def queue_notification(
        self,
        user: User,
        email_type: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        priority: str = 'normal',
        scheduled_for: Optional[datetime] = None
    ) -> NotificationQueue:
        """Queue a notification for later sending"""
        
        return NotificationQueue.objects.create(
            user=user,
            email_type=email_type,
            priority=priority,
            subject=subject,
            template_name=template_name,
            context_data=context,
            scheduled_for=scheduled_for or timezone.now()
        )
    
    def send_budget_alert(
        self,
        user: User,
        category_name: str,
        spent_amount: Decimal,
        budget_amount: Decimal,
        percentage: float
    ) -> bool:
        """Send budget alert notification"""
        
        preferences = self.get_user_preferences(user)
        
        if percentage < preferences.budget_threshold:
            return False
        
        context = {
            'user': user,
            'category_name': category_name,
            'spent_amount': spent_amount,
            'budget_amount': budget_amount,
            'percentage': percentage,
            'over_budget': percentage > 100,
            'remaining_amount': budget_amount - spent_amount
        }
        
        subject = f"Budget Alert: {category_name} ({percentage:.1f}%)"
        
        return self.send_email(
            user=user,
            email_type='budget_alert',
            subject=subject,
            template_name='notifications/budget_alert.html',
            context=context,
            priority='high' if percentage > 100 else 'normal'
        )
    
    def send_low_balance_alert(
        self,
        user: User,
        account_name: str,
        current_balance: Decimal,
        threshold: Decimal
    ) -> bool:
        """Send low balance alert notification"""
        
        context = {
            'user': user,
            'account_name': account_name,
            'current_balance': current_balance,
            'threshold': threshold,
            'difference': threshold - current_balance
        }
        
        subject = f"Low Balance Alert: {account_name}"
        
        return self.send_email(
            user=user,
            email_type='low_balance',
            subject=subject,
            template_name='notifications/low_balance_alert.html',
            context=context,
            priority='high'
        )
    
    def send_weekly_report(self, user: User, report_data: Dict[str, Any]) -> bool:
        """Send weekly financial report"""
        
        context = {
            'user': user,
            'week_start': report_data.get('week_start'),
            'week_end': report_data.get('week_end'),
            'total_spending': report_data.get('total_spending', 0),
            'total_income': report_data.get('total_income', 0),
            'net_change': report_data.get('net_change', 0),
            'top_categories': report_data.get('top_categories', []),
            'account_balances': report_data.get('account_balances', [])
        }
        
        subject = f"Weekly Financial Report - {report_data.get('week_start', 'This Week')}"
        
        return self.send_email(
            user=user,
            email_type='weekly_report',
            subject=subject,
            template_name='notifications/weekly_report.html',
            context=context,
            priority='low'
        )
    
    def send_test_notification(self, user: User) -> bool:
        """Send a test notification"""
        
        context = {
            'user': user,
            'test_time': timezone.now(),
            'preferences_url': f"{settings.FRONTEND_URL}/settings"
        }
        
        subject = "Test Notification - Your Finance App"
        
        return self.send_email(
            user=user,
            email_type='security_alert',  # Use existing type for test
            subject=subject,
            template_name='notifications/test_notification.html',
            context=context,
            priority='normal'
        )
    
    def get_notification_stats(self, user: User) -> Dict[str, Any]:
        """Get notification statistics for a user"""
        
        notifications = EmailNotification.objects.filter(user=user)
        recent_notifications = notifications.order_by('-sent_at')[:10]
        
        total_sent = notifications.count()
        successful_sent = notifications.filter(success=True).count()
        success_rate = (successful_sent / total_sent * 100) if total_sent > 0 else 0
        
        # Count by type
        type_counts = notifications.values('email_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        pending_notifications = NotificationQueue.objects.filter(
            user=user,
            status='pending'
        ).count()
        
        return {
            'total_sent': total_sent,
            'success_rate': success_rate,
            'recent_notifications': recent_notifications,
            'pending_notifications': pending_notifications,
            'type_counts': type_counts,
            'budget_alerts_sent': notifications.filter(email_type='budget_alert').count(),
            'low_balance_alerts_sent': notifications.filter(email_type='low_balance').count(),
            'weekly_reports_sent': notifications.filter(email_type='weekly_report').count(),
            'monthly_reports_sent': notifications.filter(email_type='monthly_report').count(),
        }


class BudgetMonitoringService:
    """Service for monitoring budgets and triggering alerts"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    def check_budget_alerts(self, user: User) -> List[bool]:
        """Check all user budgets and send alerts if needed"""
        from apps.finance.models import SpendingCategory, MonthlySpending
        
        alerts_sent = []
        current_date = timezone.now()
        
        # Get user's spending categories with budgets
        categories = SpendingCategory.objects.filter(
            user=user,
            monthly_budget__gt=0
        )
        
        for category in categories:
            try:
                # Get current month spending
                monthly_spending = MonthlySpending.objects.get(
                    user=user,
                    category=category,
                    year=current_date.year,
                    month=current_date.month
                )
                
                spent_amount = monthly_spending.amount_spent
                budget_amount = category.monthly_budget
                percentage = (spent_amount / budget_amount * 100) if budget_amount > 0 else 0
                
                # Send alert if needed
                alert_sent = self.notification_service.send_budget_alert(
                    user=user,
                    category_name=category.name,
                    spent_amount=spent_amount,
                    budget_amount=budget_amount,
                    percentage=percentage
                )
                
                alerts_sent.append(alert_sent)
                
            except MonthlySpending.DoesNotExist:
                # No spending this month for this category
                continue
            except Exception as e:
                logger.error(f"Error checking budget for category {category.name}: {str(e)}")
                continue
        
        return alerts_sent
    
    def check_balance_alerts(self, user: User) -> List[bool]:
        """Check all user account balances and send alerts if needed"""
        from apps.finance.models import Account
        
        alerts_sent = []
        preferences = self.notification_service.get_user_preferences(user)
        
        # Get user's active accounts
        accounts = Account.objects.filter(
            institution__user=user,
            is_active=True,
            is_asset=True  # Only check asset accounts for low balance
        )
        
        for account in accounts:
            try:
                if account.current_balance <= preferences.low_balance_threshold:
                    alert_sent = self.notification_service.send_low_balance_alert(
                        user=user,
                        account_name=account.name,
                        current_balance=account.current_balance,
                        threshold=preferences.low_balance_threshold
                    )
                    alerts_sent.append(alert_sent)
                    
            except Exception as e:
                logger.error(f"Error checking balance for account {account.name}: {str(e)}")
                continue
        
        return alerts_sent 