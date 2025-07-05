from django.shortcuts import render
from rest_framework import generics, permissions, status, viewsets, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
import logging
import uuid
from django.conf import settings

from .models import (
    Institution, Account, Transaction, SpendingCategory,
    MonthlySpending, NetWorthSnapshot, PlaidWebhook, Holding, InvestmentTransaction
)
from .serializers import (
    InstitutionSerializer, AccountSerializer, TransactionSerializer,
    SpendingCategorySerializer, MonthlySpendingSerializer,
    NetWorthSnapshotSerializer, PlaidLinkTokenSerializer,
    PlaidPublicTokenExchangeSerializer, PlaidWebhookSerializer,
    DashboardSerializer, HoldingSerializer, InvestmentTransactionSerializer
)
from .services import PlaidService, TransactionSyncService, AnalyticsService

logger = logging.getLogger(__name__)


class CreateLinkTokenView(views.APIView):
    """Create a Plaid Link token"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PlaidLinkTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if investments should be included
        include_investments = request.data.get('include_investments', False)
        
        # Determine if we should include redirect_uri based on environment
        frontend_url = settings.FRONTEND_URL
        redirect_uri = None
        
        # Only include redirect_uri for HTTPS URLs (required by OAuth institutions like Chase)
        if frontend_url.startswith('https://'):
            redirect_uri = f"{frontend_url}/finance/oauth-callback"
        
        try:
            plaid_service = PlaidService()
            link_token_data = plaid_service.create_link_token(
                user=request.user,
                redirect_uri=redirect_uri,
                include_investments=include_investments
            )
            
            return Response(link_token_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating link token: {e}")
            return Response(
                {"error": "Failed to create link token"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExchangePublicTokenView(views.APIView):
    """Exchange public token for access token and save institution"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PlaidPublicTokenExchangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            plaid_service = PlaidService()
            
            # Exchange public token for access token
            token_data = plaid_service.exchange_public_token(
                serializer.validated_data['public_token']
            )
            
            # Get institution details
            institution_data = plaid_service.get_institution(
                serializer.validated_data['institution_id']
            )
            
            # Create or update institution
            institution, created = Institution.objects.update_or_create(
                user=request.user,
                plaid_institution_id=serializer.validated_data['institution_id'],
                defaults={
                    'name': serializer.validated_data['institution_name'],
                    'access_token': token_data['access_token'],
                    'item_id': token_data['item_id'],
                    'logo_url': institution_data.get('logo'),
                    'primary_color': institution_data.get('primary_color'),
                    'url': institution_data.get('url'),
                    'is_active': True,
                    'needs_update': False,
                    'error_message': None,
                }
            )
            
            # Get and save accounts
            accounts_data = plaid_service.get_accounts(token_data['access_token'])
            for acc_data in accounts_data:
                # Attempt to match an existing account (same institution) by MASK only.
                # Mask (last-4) is stable across product upgrades; name alone is too ambiguous.
                if acc_data.get('mask'):
                    account = Account.objects.filter(
                        institution=institution,
                        mask=acc_data['mask'],
                        subtype=acc_data['subtype']  # ensure we don't merge brokerage vs stock-plan sharing mask
                    ).first()
                else:
                    account = None

                if account:
                    # Update the existing record rather than creating a duplicate
                    account.plaid_account_id = acc_data['account_id']
                    account.name = acc_data['name']
                    account.official_name = acc_data.get('official_name')
                    account.mask = acc_data.get('mask')
                    account.type = acc_data['type']
                    account.subtype = acc_data['subtype']
                    bal = acc_data['balances']
                    current_val = bal.get('current') if bal.get('current') is not None else bal.get('available')
                    account.current_balance = current_val or 0
                    account.available_balance = bal.get('available')
                    account.limit = bal.get('limit')
                    account.iso_currency_code = bal.get('iso_currency_code', 'USD')
                    account.is_active = True
                    account.save()
                else:
                    # No match – create fresh record
                    bal = acc_data['balances']
                    current_val = bal.get('current') if bal.get('current') is not None else bal.get('available')
                    Account.objects.create(
                        institution=institution,
                        plaid_account_id=acc_data['account_id'],
                        name=acc_data['name'],
                        official_name=acc_data.get('official_name'),
                        mask=acc_data.get('mask'),
                        type=acc_data['type'],
                        subtype=acc_data['subtype'],
                        current_balance=current_val or 0,
                        available_balance=bal.get('available'),
                        limit=bal.get('limit'),
                        iso_currency_code=bal.get('iso_currency_code', 'USD'),
                        is_active=True,
                    )
            
            # Sync initial transactions
            sync_service = TransactionSyncService()
            sync_service.sync_institution_transactions(institution)
            
            # Check if there are investment accounts and sync investment data
            investment_accounts = Account.objects.filter(
                institution=institution,
                type='investment'
            )
            
            if investment_accounts.exists():
                logger.info(f"Found {investment_accounts.count()} investment accounts, syncing investment data")
                try:
                    from .services import InvestmentSyncService
                    investment_service = InvestmentSyncService()
                    
                    # Sync holdings
                    investment_service.sync_institution_holdings(institution)
                    
                    # Sync investment transactions (last 1 year)
                    start_date = (datetime.now() - timedelta(days=365)).date()
                    end_date = datetime.now().date()
                    investment_service.sync_institution_investment_transactions(
                        institution, start_date, end_date
                    )
                except Exception as e:
                    logger.warning(f"Could not sync investment data: {e}")
                    # Don't fail the whole process if investment sync fails
            
            # Return institution data
            serializer = InstitutionSerializer(institution)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error exchanging public token: {e}")
            return Response(
                {"error": "Failed to connect institution"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InstitutionViewSet(viewsets.ModelViewSet):
    """ViewSet for institutions"""
    serializer_class = InstitutionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Institution.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        institution = self.get_object()
        institution.is_active = not institution.is_active
        institution.save()
        Account.objects.filter(institution=institution).update(is_active=institution.is_active)
        logger.info(f"Institution {institution.name} active status set to {institution.is_active}")
        return Response({'status': 'success', 'is_active': institution.is_active})
    
    @action(detail=True, methods=['post'])
    def sync_transactions(self, request, pk=None):
        """Manually sync transactions for an institution"""
        institution = self.get_object()
        
        try:
            sync_service = TransactionSyncService()
            sync_service.sync_institution_transactions(institution)
            
            return Response({"status": "success"})
        except Exception as e:
            logger.error(f"Error syncing transactions: {e}")
            return Response(
                {"error": "Failed to sync transactions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def update_balances(self, request, pk=None):
        """Update account balances for an institution"""
        institution = self.get_object()
        
        try:
            plaid_service = PlaidService()
            accounts_data = plaid_service.update_account_balances(institution.access_token)
            
            for acc_data in accounts_data:
                Account.objects.filter(
                    plaid_account_id=acc_data['account_id']
                ).update(
                    current_balance=(acc_data['balances'].get('current') if acc_data['balances'].get('current') is not None else acc_data['balances'].get('available')) or 0,
                    available_balance=acc_data['balances'].get('available'),
                    limit=acc_data['balances'].get('limit'),
                )
            
            return Response({"status": "success"})
        except Exception as e:
            logger.error(f"Error updating balances: {e}")
            return Response(
                {"error": "Failed to update balances"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def upgrade_for_investments(self, request, pk=None):
        """Get a link token to upgrade institution for investment access"""
        institution = self.get_object()
        
        # Check if institution has investment accounts
        investment_accounts = Account.objects.filter(
            institution=institution,
            type='investment'
        )
        
        if not investment_accounts.exists():
            return Response({
                "error": "No investment accounts found for this institution"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create link token with investments enabled
            plaid_service = PlaidService()
            link_token_data = plaid_service.create_link_token(
                user=request.user,
                include_investments=True
            )
            
            return Response({
                "link_token": link_token_data['link_token'],
                "expiration": link_token_data['expiration'],
                "message": "Use this link token to re-link your account with investment access"
            })
        except Exception as e:
            logger.error(f"Error creating investment upgrade link token: {e}")
            return Response(
                {"error": "Failed to create upgrade link token"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_destroy(self, instance):
        plaid_service = PlaidService()
        try:
            if instance.access_token:
                logger.info(f"Attempting to remove Plaid item for institution: {instance.name} (Item ID: {instance.item_id})")
                plaid_service.remove_item(instance.access_token)
                logger.info(f"Successfully removed Plaid item for institution: {instance.name}")
            else:
                logger.warning(f"No access token found for institution {instance.name}. Skipping Plaid item removal.")
        except Exception as e:
            logger.error(f"Error calling Plaid /item/remove for institution {instance.name} (Item ID: {instance.item_id}): {e}")
        
        super().perform_destroy(instance)


class AccountViewSet(viewsets.ModelViewSet):
    """ViewSet for accounts"""
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Account.objects.filter(
            institution__user=self.request.user
        ).select_related('institution')
    
    @action(detail=True, methods=['post'])
    def toggle_selected(self, request, pk=None):
        """Toggle account selection for reports"""
        account = self.get_object()
        account.is_selected = not account.is_selected
        account.save()
        
        return Response({"is_selected": account.is_selected})


class TransactionPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for transactions"""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = TransactionPagination
    
    def get_queryset(self):
        queryset = Transaction.objects.filter(
            account__institution__user=self.request.user
        ).select_related('account', 'account__institution')
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by account
        account_id = self.request.query_params.get('account_id')
        if account_id:
            # Try to filter by UUID first, then by Plaid account ID if UUID fails
            try:
                # Check if account_id is a valid UUID
                uuid.UUID(account_id)
                # If valid UUID, filter by account.id
                queryset = queryset.filter(account_id=account_id)
            except (ValueError, TypeError):
                # If not a valid UUID, assume it's a Plaid account ID
                queryset = queryset.filter(account__plaid_account_id=account_id)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(primary_category=category)
        
        # Filter by amount range
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        
        if min_amount:
            try:
                min_val = float(min_amount)
                # Filter by absolute value since amounts can be positive or negative
                queryset = queryset.filter(
                    Q(amount__gte=min_val) | Q(amount__lte=-min_val)
                )
            except ValueError:
                pass  # Ignore invalid min_amount values
        
        if max_amount:
            try:
                max_val = float(max_amount)
                # Filter by absolute value since amounts can be positive or negative
                queryset = queryset.filter(
                    Q(amount__lte=max_val, amount__gte=0) | Q(amount__gte=-max_val, amount__lte=0)
                )
            except ValueError:
                pass  # Ignore invalid max_amount values
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(merchant_name__icontains=search) |
                Q(notes__icontains=search)
            )
        
        return queryset.order_by('-date', '-datetime')
    
    @action(detail=True, methods=['patch'])
    def update_category(self, request, pk=None):
        """Update user category for a transaction"""
        transaction = self.get_object()
        transaction.user_category = request.data.get('category')
        transaction.save()
        
        return Response({"user_category": transaction.user_category})
    
    @action(detail=True, methods=['patch'])
    def update_notes(self, request, pk=None):
        """Update notes for a transaction"""
        transaction = self.get_object()
        transaction.notes = request.data.get('notes')
        transaction.save()
        
        return Response({"notes": transaction.notes})


class SpendingCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for spending categories"""
    serializer_class = SpendingCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SpendingCategory.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class HoldingViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for investment holdings"""
    serializer_class = HoldingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Holding.objects.filter(
            account__institution__user=self.request.user
        ).select_related('account', 'account__institution', 'security').order_by('-institution_value')
    
    def list(self, request, *args, **kwargs):
        """List holdings with optional filtering by account"""
        queryset = self.get_queryset()
        
        # Filter by account if specified
        account_id = request.query_params.get('account_id')
        if account_id:
            # Try to filter by UUID first, then by Plaid account ID if UUID fails
            try:
                # Check if account_id is a valid UUID
                uuid.UUID(account_id)
                # If valid UUID, filter by account.id
                queryset = queryset.filter(account_id=account_id)
            except (ValueError, TypeError):
                # If not a valid UUID, assume it's a Plaid account ID
                queryset = queryset.filter(account__plaid_account_id=account_id)
        
        # Filter by institution if specified
        institution_id = request.query_params.get('institution_id')
        if institution_id:
            queryset = queryset.filter(account__institution_id=institution_id)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate portfolio summary
        total_value = sum(holding.institution_value for holding in queryset)
        total_gain_loss = sum(
            holding.unrealized_gain_loss for holding in queryset 
            if holding.unrealized_gain_loss is not None
        )
        
        return Response({
            'holdings': serializer.data,
            'summary': {
                'total_value': float(total_value),
                'total_value_display': f"${total_value:,.2f}",
                'total_gain_loss': float(total_gain_loss) if total_gain_loss else None,
                'total_gain_loss_display': f"${total_gain_loss:,.2f}" if total_gain_loss else "N/A",
                'holdings_count': len(queryset)
            }
        })


class InvestmentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for investment transactions"""
    serializer_class = InvestmentTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InvestmentTransaction.objects.filter(
            account__institution__user=self.request.user
        ).select_related('account', 'account__institution', 'security')
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by account
        account_id = self.request.query_params.get('account_id')
        if account_id:
            # Try to filter by UUID first, then by Plaid account ID if UUID fails
            try:
                # Check if account_id is a valid UUID
                uuid.UUID(account_id)
                # If valid UUID, filter by account.id
                queryset = queryset.filter(account_id=account_id)
            except (ValueError, TypeError):
                # If not a valid UUID, assume it's a Plaid account ID
                queryset = queryset.filter(account__plaid_account_id=account_id)
        
        # Filter by transaction type
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        
        return queryset.order_by('-date')


class DashboardView(views.APIView):
    """Dashboard overview endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        analytics = AnalyticsService()
        
        # Get date range for current month
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Net worth calculation
        net_worth_data = analytics.calculate_net_worth(request.user)
        
        # Get institutions
        institutions = Institution.objects.filter(
            user=request.user,
            is_active=True
        ).prefetch_related('accounts')
        
        # Recent transactions
        recent_transactions = Transaction.objects.filter(
            account__institution__user=request.user
        ).select_related('account', 'account__institution').order_by('-date')[:20]
        
        # Spending by category
        spending_by_category = analytics.get_spending_by_category(
            request.user,
            start_of_month,
            now
        )
        
        # Monthly cash flow
        monthly_cash_flow = analytics.get_monthly_cash_flow(
            request.user,
            now.year,
            now.month
        )
        
        # Net worth trend (last 30 days)
        net_worth_trend = NetWorthSnapshot.objects.filter(
            user=request.user,
            date__gte=now - timedelta(days=30)
        ).order_by('date')
        
        data = {
            'net_worth': net_worth_data['net_worth'],
            'total_assets': net_worth_data['total_assets'],
            'total_liabilities': net_worth_data['total_liabilities'],
            'net_worth_as_of': net_worth_data['as_of'],
            'institutions': institutions,
            'recent_transactions': recent_transactions,
            'spending_by_category': spending_by_category,
            'monthly_cash_flow': monthly_cash_flow,
            'net_worth_trend': net_worth_trend,
        }
        
        serializer = DashboardSerializer(data)
        return Response(serializer.data)


class MonthlySpendingView(views.APIView):
    """Monthly spending report"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        spending = MonthlySpending.objects.filter(
            user=request.user,
            year=year,
            month=month
        ).select_related('category')
        
        serializer = MonthlySpendingSerializer(spending, many=True)
        return Response(serializer.data)


class NetWorthTrendView(views.APIView):
    """Net worth trend over time"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        days = int(request.query_params.get('days', 365))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        snapshots = NetWorthSnapshot.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        serializer = NetWorthSnapshotSerializer(snapshots, many=True)
        return Response(serializer.data)


class PlaidWebhookView(views.APIView):
    """Handle Plaid webhooks"""
    permission_classes = []  # No auth for webhooks
    
    def post(self, request):
        webhook_type = request.data.get('webhook_type')
        webhook_code = request.data.get('webhook_code')
        item_id = request.data.get('item_id')
        
        # Save webhook for processing
        webhook = PlaidWebhook.objects.create(
            webhook_type=webhook_type,
            webhook_code=webhook_code,
            item_id=item_id,
            payload=request.data,
        )
        
        # Process webhook asynchronously (using Celery in production)
        # For now, process synchronously
        try:
            if webhook_type == 'TRANSACTIONS':
                if webhook_code in ['INITIAL_UPDATE', 'DEFAULT_UPDATE']:
                    # Sync transactions for the institution
                    institution = Institution.objects.get(item_id=item_id)
                    sync_service = TransactionSyncService()
                    sync_service.sync_institution_transactions(institution)
                elif webhook_code == 'TRANSACTIONS_REMOVED':
                    # Handle removed transactions
                    removed_ids = request.data.get('removed_transactions', [])
                    Transaction.objects.filter(
                        plaid_transaction_id__in=removed_ids
                    ).delete()
            
            elif webhook_type == 'ITEM':
                if webhook_code == 'ERROR':
                    # Mark institution as needing update
                    Institution.objects.filter(item_id=item_id).update(
                        needs_update=True,
                        error_message=str(request.data.get('error'))
                    )
            
            webhook.processed = True
            webhook.processed_at = timezone.now()
            webhook.save()
            
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            webhook.error = str(e)
            webhook.save()
        
        return Response({"status": "received"})
