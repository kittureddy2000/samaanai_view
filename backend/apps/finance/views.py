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
import secrets
import uuid
from django.conf import settings

from .models import (
    Institution, Account, Transaction, SpendingCategory,
    MonthlySpending, NetWorthSnapshot, PlaidWebhook, Holding, InvestmentTransaction,
    RecurringTransaction
)
from .serializers import (
    InstitutionSerializer, AccountSerializer, TransactionSerializer,
    SpendingCategorySerializer, MonthlySpendingSerializer,
    NetWorthSnapshotSerializer, PlaidLinkTokenSerializer,
    PlaidPublicTokenExchangeSerializer, PlaidWebhookSerializer,
    DashboardSerializer, HoldingSerializer, InvestmentTransactionSerializer,
    RecurringTransactionSerializer
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
            
            # Also sync holdings if institution has investment accounts
            from .services import InvestmentSyncService
            investment_accounts = Account.objects.filter(
                institution=institution,
                type='investment'
            )
            
            if investment_accounts.exists():
                try:
                    investment_service = InvestmentSyncService()
                    investment_service.sync_institution_holdings(institution)
                    
                    # Sync investment transactions (last 1 year)
                    start_date = (datetime.now() - timedelta(days=365)).date()
                    end_date = datetime.now().date()
                    investment_service.sync_institution_investment_transactions(
                        institution, start_date, end_date
                    )
                except Exception as e:
                    logger.warning(f"Could not sync investment data: {e}")
            
            return Response({"status": "success"})
        except Exception as e:
            logger.error(f"Error syncing transactions: {e}")
            return Response(
                {"error": "Failed to sync transactions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def sync_holdings(self, request, pk=None):
        """Manually sync investment holdings for an institution"""
        institution = self.get_object()
        
        try:
            from .services import InvestmentSyncService
            
            investment_accounts = Account.objects.filter(
                institution=institution,
                type='investment'
            )
            
            if not investment_accounts.exists():
                return Response({"status": "no_investment_accounts"})
            
            investment_service = InvestmentSyncService()
            investment_service.sync_institution_holdings(institution)
            
            # Also sync investment transactions (last 1 year)
            start_date = (datetime.now() - timedelta(days=365)).date()
            end_date = datetime.now().date()
            investment_service.sync_institution_investment_transactions(
                institution, start_date, end_date
            )
            
            return Response({"status": "success"})
        except Exception as e:
            logger.error(f"Error syncing holdings: {e}")
            return Response(
                {"error": f"Failed to sync holdings: {str(e)}"},
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
    
    @action(detail=True, methods=['post'])
    def create_update_link_token(self, request, pk=None):
        """Create a link token for updating/reconnecting an institution that needs re-authentication"""
        institution = self.get_object()
        
        try:
            plaid_service = PlaidService()
            
            # Create link token in update mode using the existing access token
            from plaid.model.link_token_create_request import LinkTokenCreateRequest
            from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
            from plaid.model.country_code import CountryCode
            
            link_request = LinkTokenCreateRequest(
                user=LinkTokenCreateRequestUser(client_user_id=str(request.user.id)),
                client_name="Samaanai Finance",
                country_codes=[CountryCode('US')],
                language="en",
                access_token=institution.access_token,  # This puts Link in update mode
            )
            
            response = plaid_service.client.link_token_create(link_request)
            
            return Response({
                "link_token": response['link_token'],
                "expiration": response['expiration'],
                "institution_id": str(institution.id),
                "institution_name": institution.name,
                "message": "Use this link token to reconnect your account"
            })
        except Exception as e:
            logger.error(f"Error creating update link token for institution {institution.name}: {e}")
            return Response(
                {"error": "Failed to create update link token"},
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
        # Include both Plaid-linked accounts (via institution) and manual accounts (via user)
        return Account.objects.filter(
            Q(institution__user=self.request.user) | Q(user=self.request.user)
        ).select_related('institution').distinct()
    
    @action(detail=True, methods=['post'])
    def toggle_selected(self, request, pk=None):
        """Toggle account selection for reports"""
        account = self.get_object()
        account.is_selected = not account.is_selected
        account.save()

        return Response({"is_selected": account.is_selected})

    @action(detail=True, methods=['patch'])
    def update_custom_name(self, request, pk=None):
        """Update custom name for an account"""
        account = self.get_object()
        custom_name = request.data.get('custom_name', '').strip()

        # Allow empty string to clear custom name
        account.custom_name = custom_name if custom_name else None
        account.save()

        serializer = self.get_serializer(account)
        return Response(serializer.data)


class CreateManualAccountView(views.APIView):
    """Create a manual institution and account (not from Plaid)"""
    permission_classes = [permissions.IsAuthenticated]
    
    # Common preset institutions for quick selection
    PRESET_INSTITUTIONS = {
        'coinbase': {'name': 'Coinbase', 'primary_color': '#0052ff', 'url': 'https://coinbase.com'},
        'robinhood': {'name': 'Robinhood', 'primary_color': '#00c805', 'url': 'https://robinhood.com'},
        'crypto.com': {'name': 'Crypto.com', 'primary_color': '#103f68', 'url': 'https://crypto.com'},
        'binance': {'name': 'Binance', 'primary_color': '#f3ba2f', 'url': 'https://binance.com'},
        'venmo': {'name': 'Venmo', 'primary_color': '#3d95ce', 'url': 'https://venmo.com'},
        'paypal': {'name': 'PayPal', 'primary_color': '#003087', 'url': 'https://paypal.com'},
        'cash_app': {'name': 'Cash App', 'primary_color': '#00d632', 'url': 'https://cash.app'},
    }
    
    def post(self, request):
        """
        Create a manual institution (if needed) and account.
        
        Request body:
        {
            "institution_name": "Coinbase",
            "account_name": "My Coinbase Account",
            "account_type": "investment",  # depository, credit, loan, investment, other
            "account_subtype": "brokerage",  # optional
            "current_balance": 0  # optional, defaults to 0
        }
        """
        institution_name = request.data.get('institution_name', '').strip()
        account_name = request.data.get('account_name', '').strip()
        account_type = request.data.get('account_type', 'other')
        account_subtype = request.data.get('account_subtype', 'other')
        current_balance = request.data.get('current_balance', 0)
        
        if not institution_name:
            return Response(
                {"error": "institution_name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not account_name:
            return Response(
                {"error": "account_name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check for preset institution metadata
            preset_key = institution_name.lower().replace(' ', '_').replace('.', '')
            preset_data = self.PRESET_INSTITUTIONS.get(preset_key, {})
            
            # Get or create the manual institution
            institution, created = Institution.objects.get_or_create(
                user=request.user,
                name=preset_data.get('name', institution_name),
                is_manual=True,
                defaults={
                    'primary_color': preset_data.get('primary_color'),
                    'url': preset_data.get('url'),
                    'is_active': True,
                }
            )
            
            # Create the account
            account = Account.objects.create(
                institution=institution,
                user=request.user,
                name=account_name,
                type=account_type,
                subtype=account_subtype or 'other',
                current_balance=current_balance,
                is_manual=True,
                is_active=True,
                is_selected=True,
            )
            
            # Serialize and return
            account_serializer = AccountSerializer(account)
            institution_serializer = InstitutionSerializer(institution)
            
            return Response({
                "status": "success",
                "message": f"Manual account '{account_name}' created successfully",
                "institution": institution_serializer.data,
                "account": account_serializer.data,
                "institution_created": created,
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating manual account: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    
    @action(detail=False, methods=['post'])
    def create_manual(self, request):
        """Create a manual transaction (not from Plaid)"""
        try:
            account_id = request.data.get('account_id')
            if not account_id:
                return Response(
                    {"error": "account_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify user owns the account
            try:
                account = Account.objects.get(
                    id=account_id,
                    institution__user=request.user
                )
            except Account.DoesNotExist:
                return Response(
                    {"error": "Account not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create the transaction
            transaction = Transaction.objects.create(
                account=account,
                plaid_transaction_id=f"manual_{uuid.uuid4()}",  # Unique ID for manual transactions
                amount=float(request.data.get('amount', 0)),
                name=request.data.get('description', 'Manual Transaction'),
                merchant_name=request.data.get('merchant_name', request.data.get('description', '')),
                date=request.data.get('date', timezone.now().date()),
                primary_category=request.data.get('category', 'OTHER'),
                user_category=request.data.get('user_category', ''),
                notes=request.data.get('notes', ''),
                is_manual=True,  # Flag for manual transactions
                pending=False
            )
            
            serializer = TransactionSerializer(transaction)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating manual transaction: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['patch'])
    def toggle_exclude_from_reports(self, request, pk=None):
        """Toggle whether a transaction is excluded from reports"""
        transaction = self.get_object()
        # Toggle the value or set explicitly if provided
        if 'exclude' in request.data:
            transaction.exclude_from_reports = request.data.get('exclude', False)
        else:
            transaction.exclude_from_reports = not transaction.exclude_from_reports
        transaction.save()
        
        return Response({
            "exclude_from_reports": transaction.exclude_from_reports
        })


class SpendingCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for spending categories with hierarchical support"""
    serializer_class = SpendingCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = SpendingCategory.objects.filter(user=self.request.user)
        
        # Filter by parent status
        parent_only = self.request.query_params.get('parent_only')
        if parent_only == 'true':
            queryset = queryset.filter(parent__isnull=True)
        
        children_only = self.request.query_params.get('children_only')
        if children_only == 'true':
            queryset = queryset.filter(parent__isnull=False)
        
        # Filter by specific parent
        parent_id = self.request.query_params.get('parent_id')
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        
        return queryset.select_related('parent')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get hierarchical tree of categories (root categories with nested children)"""
        from .serializers import SpendingCategoryTreeSerializer
        
        # Get only root categories (no parent)
        root_categories = SpendingCategory.objects.filter(
            user=request.user,
            parent__isnull=True
        ).prefetch_related('subcategories')
        
        serializer = SpendingCategoryTreeSerializer(root_categories, many=True)
        return Response(serializer.data)


class RecurringTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for recurring transactions (subscriptions, bills, etc.)"""
    serializer_class = RecurringTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = RecurringTransaction.objects.filter(user=self.request.user)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by income/expense
        is_income = self.request.query_params.get('is_income')
        if is_income is not None:
            queryset = queryset.filter(is_income=is_income.lower() == 'true')
        
        return queryset.select_related('category')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of recurring transactions"""
        recurring = self.get_queryset().filter(is_active=True)
        
        # Calculate monthly totals
        monthly_income = sum(r.monthly_amount for r in recurring if r.is_income)
        monthly_expenses = sum(r.monthly_amount for r in recurring if not r.is_income)
        
        # Get upcoming (due in next 7 days)
        upcoming = [r for r in recurring if r.is_due_soon]
        upcoming_serializer = RecurringTransactionSerializer(upcoming, many=True)
        
        return Response({
            'monthly_income': round(monthly_income, 2),
            'monthly_expenses': round(monthly_expenses, 2),
            'net_monthly': round(monthly_income - monthly_expenses, 2),
            'total_active': recurring.count(),
            'upcoming_count': len(upcoming),
            'upcoming': upcoming_serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def detect_patterns(self, request):
        """Auto-detect recurring transactions from transaction history"""
        from .services import RecurringTransactionDetectionService
        
        detection_service = RecurringTransactionDetectionService()
        
        # auto_create defaults to True - creates the recurring transactions
        auto_create = request.data.get('auto_create', True)
        min_occurrences = request.data.get('min_occurrences', 3)
        
        patterns = detection_service.create_recurring_transactions(
            user=request.user,
            auto_create=auto_create
        )
        
        # Serialize the patterns for response (exclude transaction objects)
        serialized_patterns = []
        for p in patterns:
            serialized_patterns.append({
                'merchant': p['merchant'],
                'amount': p['amount'],
                'frequency': p['frequency'],
                'occurrences': p['occurrences'],
                'first_date': p['first_date'].isoformat(),
                'last_date': p['last_date'].isoformat(),
                'primary_category': p.get('primary_category'),
                'existing_id': p.get('existing_id'),
                'created_id': p.get('created_id'),
            })
        
        created_count = sum(1 for p in patterns if p.get('created_id'))
        existing_count = sum(1 for p in patterns if p.get('existing_id'))
        
        return Response({
            'patterns_detected': len(patterns),
            'created_count': created_count,
            'existing_count': existing_count,
            'patterns': serialized_patterns
        })


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
        from datetime import datetime
        analytics = AnalyticsService()
        
        # Get date range from query params or default to current month
        now = timezone.now()
        
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            except ValueError:
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            except ValueError:
                end_date = now
        else:
            end_date = now
        
        # Net worth calculation
        net_worth_data = analytics.calculate_net_worth(request.user)
        
        # Get institutions
        institutions = Institution.objects.filter(
            user=request.user,
            is_active=True
        ).prefetch_related('accounts')
        
        # Recent transactions - filter by date range and get all (not just 20)
        recent_transactions = Transaction.objects.filter(
            account__institution__user=request.user,
            date__gte=start_date.date(),
            date__lte=end_date.date()
        ).select_related('account', 'account__institution').order_by('-date')
        
        # Spending by category for the date range
        spending_by_category = analytics.get_spending_by_category(
            request.user,
            start_date,
            end_date
        )
        
        # Monthly cash flow for the end date's month
        monthly_cash_flow = analytics.get_monthly_cash_flow(
            request.user,
            end_date.year,
            end_date.month
        )
        
        # Net worth trend (last 30 days from end_date)
        net_worth_trend = NetWorthSnapshot.objects.filter(
            user=request.user,
            date__gte=end_date - timedelta(days=30)
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
    authentication_classes = []
    permission_classes = []  # Explicitly allow unauthenticated webhooks with additional secret validation

    def _valid_secret(self, request) -> bool:
        expected = getattr(settings, 'PLAID_WEBHOOK_SECRET', None)
        if not expected:
            # When no secret is configured we allow the request (e.g., sandbox environments)
            return True
        provided = request.query_params.get('secret') or request.headers.get('X-Plaid-Webhook-Secret')
        if not provided:
            return False
        return secrets.compare_digest(str(provided), str(expected))

    def post(self, request):
        if not self._valid_secret(request):
            logger.warning("Rejected Plaid webhook due to invalid secret")
            return Response({"error": "Invalid webhook signature"}, status=status.HTTP_403_FORBIDDEN)

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

        try:
            if webhook_type == 'TRANSACTIONS':
                if webhook_code in ['INITIAL_UPDATE', 'DEFAULT_UPDATE']:
                    try:
                        institution = Institution.objects.get(item_id=item_id)
                    except Institution.DoesNotExist:
                        logger.warning("Plaid webhook received for unknown item_id %s", item_id)
                    else:
                        sync_service = TransactionSyncService()
                        sync_service.sync_institution_transactions(institution)
                elif webhook_code == 'TRANSACTIONS_REMOVED':
                    removed_ids = request.data.get('removed_transactions', [])
                    if removed_ids and item_id:
                        Transaction.objects.filter(
                            account__institution__item_id=item_id,
                            plaid_transaction_id__in=removed_ids
                        ).delete()

            elif webhook_type == 'ITEM' and webhook_code == 'ERROR' and item_id:
                Institution.objects.filter(item_id=item_id).update(
                    needs_update=True,
                    error_message=str(request.data.get('error'))
                )

            webhook.processed = True
            webhook.processed_at = timezone.now()
            webhook.save(update_fields=['processed', 'processed_at'])

        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            webhook.error = str(e)
            webhook.save(update_fields=['error'])

        return Response({"status": "received"})


class CSVImportView(views.APIView):
    """Import transactions and holdings from CSV files (for Fidelity and other unsupported institutions)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        import csv
        import io
        from decimal import Decimal, InvalidOperation
        from dateutil import parser as date_parser
        
        csv_file = request.FILES.get('file')
        import_type = request.data.get('type', 'auto')  # 'transactions', 'holdings', or 'auto'
        institution_name = request.data.get('institution_name', 'Fidelity')
        
        if not csv_file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Read CSV content
            decoded_file = csv_file.read().decode('utf-8-sig')  # utf-8-sig handles BOM
            reader = csv.DictReader(io.StringIO(decoded_file))
            rows = list(reader)
            
            if not rows:
                return Response({"error": "CSV file is empty"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Detect file type based on columns
            columns = set(rows[0].keys()) if rows else set()
            columns_lower = {c.lower().strip() for c in columns}
            
            is_holdings = any(col in columns_lower for col in ['current value', 'cost basis', 'last price', 'current_value'])
            is_transactions = any(col in columns_lower for col in ['action', 'run date', 'settlement date', 'trade date'])
            
            if import_type == 'auto':
                import_type = 'holdings' if is_holdings else 'transactions'
            
            # Get or create manual institution for this user
            institution, inst_created = Institution.objects.get_or_create(
                user=request.user,
                plaid_institution_id=f"manual_{institution_name.lower().replace(' ', '_')}",
                defaults={
                    'name': institution_name,
                    'access_token': 'manual_import',
                    'item_id': f"manual_{request.user.id}_{institution_name.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}",
                    'is_active': True,
                }
            )
            
            result = {
                'institution': institution.name,
                'institution_created': inst_created,
                'import_type': import_type,
                'accounts_created': 0,
                'accounts_updated': 0,
                'transactions_created': 0,
                'transactions_updated': 0,
                'holdings_created': 0,
                'holdings_updated': 0,
                'errors': []
            }
            
            if import_type == 'holdings':
                result = self._import_fidelity_holdings(request.user, institution, rows, result)
            else:
                result = self._import_fidelity_transactions(request.user, institution, rows, result)
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error importing CSV: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _import_fidelity_holdings(self, user, institution, rows, result):
        """Import Fidelity holdings CSV"""
        from decimal import Decimal, InvalidOperation
        from .models import Account, Security, Holding
        
        accounts_cache = {}
        
        for row_num, row in enumerate(rows, start=2):
            try:
                # Normalize column names (Fidelity uses various naming conventions)
                row_lower = {k.lower().strip(): v.strip() if v else '' for k, v in row.items()}
                
                # Extract account info
                account_number = row_lower.get('account number', row_lower.get('account', '')).strip()
                account_name = row_lower.get('account name', row_lower.get('account type', f'Fidelity Account')).strip()
                
                if not account_number:
                    # Try to extract from first column
                    first_val = list(row.values())[0] if row else ''
                    if first_val and first_val.replace('-', '').isdigit():
                        account_number = first_val
                    else:
                        continue  # Skip rows without account number
                
                # Get or create account
                if account_number not in accounts_cache:
                    account, acc_created = Account.objects.get_or_create(
                        plaid_account_id=f"manual_{account_number}",
                        defaults={
                            'institution': institution,
                            'name': account_name or f"Fidelity {account_number[-4:]}",
                            'official_name': account_name,
                            'mask': account_number[-4:] if len(account_number) >= 4 else account_number,
                            'type': 'investment',
                            'subtype': 'brokerage',
                            'current_balance': 0,
                            'is_active': True,
                            'is_selected': True,
                        }
                    )
                    # Update institution if account exists but was orphaned
                    if not acc_created and account.institution_id != institution.id:
                        account.institution = institution
                        account.save()
                    
                    accounts_cache[account_number] = account
                    if acc_created:
                        result['accounts_created'] += 1
                    else:
                        result['accounts_updated'] += 1
                
                account = accounts_cache[account_number]
                
                # Extract holding data
                symbol = row_lower.get('symbol', row_lower.get('ticker', '')).strip()
                description = row_lower.get('description', row_lower.get('security description', row_lower.get('name', ''))).strip()
                
                # Skip cash or empty rows
                if not symbol or symbol in ['--', 'N/A', 'Pending Activity'] or 'CASH' in symbol.upper():
                    continue
                
                # Parse numeric values (Fidelity uses $ and comma formatting)
                def parse_money(val):
                    if not val or val in ['--', 'N/A', '$--']:
                        return None
                    try:
                        clean = val.replace('$', '').replace(',', '').replace('(', '-').replace(')', '').strip()
                        return Decimal(clean) if clean else None
                    except (InvalidOperation, ValueError):
                        return None
                
                def parse_quantity(val):
                    if not val or val in ['--', 'N/A']:
                        return Decimal('0')
                    try:
                        clean = val.replace(',', '').strip()
                        return Decimal(clean) if clean else Decimal('0')
                    except (InvalidOperation, ValueError):
                        return Decimal('0')
                
                quantity = parse_quantity(row_lower.get('quantity', row_lower.get('shares', '0')))
                last_price = parse_money(row_lower.get('last price', row_lower.get('price', '')))
                current_value = parse_money(row_lower.get('current value', row_lower.get('value', '')))
                cost_basis = parse_money(row_lower.get('cost basis total', row_lower.get('cost basis', row_lower.get('cost basis per share', ''))))
                
                if quantity == 0 and not current_value:
                    continue  # Skip empty holdings
                
                # Get or create security
                security, _ = Security.objects.update_or_create(
                    plaid_security_id=f"manual_{symbol}",
                    defaults={
                        'name': description or symbol,
                        'ticker_symbol': symbol,
                        'type': 'equity',
                        'close_price': last_price,
                        'close_price_as_of': timezone.now().date(),
                        'is_cash_equivalent': 'MONEY MARKET' in description.upper() if description else False,
                    }
                )
                
                # Create or update holding
                holding, h_created = Holding.objects.update_or_create(
                    account=account,
                    security=security,
                    defaults={
                        'quantity': quantity,
                        'institution_price': last_price or Decimal('0'),
                        'institution_price_as_of': timezone.now().date(),
                        'institution_value': current_value or (quantity * (last_price or Decimal('0'))),
                        'cost_basis': cost_basis,
                        'iso_currency_code': 'USD',
                    }
                )
                
                if h_created:
                    result['holdings_created'] += 1
                else:
                    result['holdings_updated'] += 1
                    
            except Exception as e:
                result['errors'].append(f"Row {row_num}: {str(e)}")
        
        # Update account balances
        for account in accounts_cache.values():
            total = Holding.objects.filter(account=account).aggregate(
                total=Sum('institution_value')
            )['total'] or Decimal('0')
            account.current_balance = total
            account.save()
        
        return result
    
    def _import_fidelity_transactions(self, user, institution, rows, result):
        """Import Fidelity transactions CSV"""
        from decimal import Decimal, InvalidOperation
        from dateutil import parser as date_parser
        from .models import Account, Transaction
        
        accounts_cache = {}
        
        for row_num, row in enumerate(rows, start=2):
            try:
                # Normalize column names
                row_lower = {k.lower().strip(): v.strip() if v else '' for k, v in row.items()}
                
                # Extract account info
                account_number = row_lower.get('account number', row_lower.get('account', '')).strip()
                
                if not account_number:
                    # Try first column
                    first_val = list(row.values())[0] if row else ''
                    if first_val and first_val.replace('-', '').isdigit():
                        account_number = first_val
                    else:
                        continue
                
                # Get or create account
                if account_number not in accounts_cache:
                    account, acc_created = Account.objects.get_or_create(
                        plaid_account_id=f"manual_{account_number}",
                        defaults={
                            'institution': institution,
                            'name': f"Fidelity {account_number[-4:]}",
                            'mask': account_number[-4:] if len(account_number) >= 4 else account_number,
                            'type': 'investment',
                            'subtype': 'brokerage',
                            'current_balance': 0,
                            'is_active': True,
                            'is_selected': True,
                        }
                    )
                    if not acc_created and account.institution_id != institution.id:
                        account.institution = institution
                        account.save()
                    
                    accounts_cache[account_number] = account
                    if acc_created:
                        result['accounts_created'] += 1
                
                account = accounts_cache[account_number]
                
                # Extract transaction data
                date_str = row_lower.get('date', row_lower.get('run date', row_lower.get('trade date', '')))
                if not date_str or date_str in ['--', 'N/A']:
                    continue
                
                try:
                    tx_date = date_parser.parse(date_str).date()
                except:
                    continue
                
                action = row_lower.get('action', row_lower.get('type', row_lower.get('transaction type', ''))).strip()
                symbol = row_lower.get('symbol', row_lower.get('ticker', '')).strip()
                description = row_lower.get('description', row_lower.get('security description', '')).strip()
                
                def parse_money(val):
                    if not val or val in ['--', 'N/A', '$--']:
                        return Decimal('0')
                    try:
                        clean = val.replace('$', '').replace(',', '').replace('(', '-').replace(')', '').strip()
                        return Decimal(clean) if clean else Decimal('0')
                    except (InvalidOperation, ValueError):
                        return Decimal('0')
                
                amount = parse_money(row_lower.get('amount', row_lower.get('net amount', '0')))
                quantity = parse_money(row_lower.get('quantity', row_lower.get('shares', '0')))
                price = parse_money(row_lower.get('price', '0'))
                
                # Determine category based on action
                action_upper = action.upper() if action else ''
                if 'BUY' in action_upper or 'PURCHASE' in action_upper:
                    category = 'INVESTMENT_BUY'
                elif 'SELL' in action_upper or 'SOLD' in action_upper:
                    category = 'INVESTMENT_SELL'
                elif 'DIVIDEND' in action_upper or 'DIV' in action_upper:
                    category = 'DIVIDEND'
                elif 'INTEREST' in action_upper:
                    category = 'INTEREST'
                elif 'TRANSFER' in action_upper:
                    category = 'TRANSFER'
                elif 'FEE' in action_upper:
                    category = 'BANK_FEES'
                else:
                    category = 'OTHER'
                
                # Create unique transaction ID
                tx_id = f"manual_{account_number}_{tx_date}_{symbol or 'cash'}_{abs(amount)}"
                
                tx, tx_created = Transaction.objects.update_or_create(
                    plaid_transaction_id=tx_id,
                    defaults={
                        'account': account,
                        'amount': abs(amount) if 'BUY' in action_upper or 'PURCHASE' in action_upper or amount > 0 else -abs(amount),
                        'iso_currency_code': 'USD',
                        'name': description or action or 'Transaction',
                        'merchant_name': 'Fidelity',
                        'primary_category': category,
                        'date': tx_date,
                        'pending': False,
                        'is_manual': True,
                    }
                )
                
                if tx_created:
                    result['transactions_created'] += 1
                else:
                    result['transactions_updated'] += 1
                    
            except Exception as e:
                result['errors'].append(f"Row {row_num}: {str(e)}")
        
        return result


class PDFImportView(views.APIView):
    """Import transactions from PDF documents using LLM extraction."""
    permission_classes = [permissions.IsAuthenticated]
    
    # In-memory cache for pending imports (in production, use Redis or DB)
    _pending_imports = {}
    
    def post(self, request):
        """
        Extract transactions from a PDF file and return for preview.
        
        Request (multipart/form-data):
        - file: PDF file
        - account_id: UUID of target account
        
        Returns extracted transactions for preview before confirmation.
        """
        from .services.pdf_extractor import PDFTransactionExtractor
        
        pdf_file = request.FILES.get('file')
        account_id = request.data.get('account_id')
        
        if not pdf_file:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not account_id:
            return Response(
                {"error": "account_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify user owns the account
        try:
            account = Account.objects.get(
                Q(id=account_id, institution__user=request.user) |
                Q(id=account_id, user=request.user)
            )
        except Account.DoesNotExist:
            return Response(
                {"error": "Account not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check file type
        if not pdf_file.name.lower().endswith('.pdf'):
            return Response(
                {"error": "File must be a PDF"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Extract transactions from PDF
            extractor = PDFTransactionExtractor()
            result = extractor.extract_transactions(pdf_file)
            
            if not result['transactions']:
                return Response({
                    "status": "no_transactions",
                    "message": "No transactions could be extracted from the PDF",
                    "metadata": result['metadata']
                })
            
            # Generate import ID for confirmation
            import_id = str(uuid.uuid4())
            
            # Store pending import (with expiry in production)
            self._pending_imports[import_id] = {
                'user_id': request.user.id,
                'account_id': str(account.id),
                'transactions': result['transactions'],
                'created_at': timezone.now().isoformat(),
            }
            
            return Response({
                "status": "preview",
                "import_id": import_id,
                "account": {
                    "id": str(account.id),
                    "name": account.name,
                },
                "transactions": result['transactions'],
                "metadata": result['metadata'],
            })
            
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error extracting transactions from PDF: {e}")
            return Response(
                {"error": "Failed to process PDF. Please ensure it's a valid financial statement."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PDFImportConfirmView(views.APIView):
    """Confirm and create transactions from PDF import."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Confirm the PDF import and create transactions.
        
        Request:
        - import_id: ID from the preview response
        - transactions: Optional modified transactions list
        """
        import_id = request.data.get('import_id')
        modified_transactions = request.data.get('transactions')
        
        if not import_id:
            return Response(
                {"error": "import_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get pending import
        pending = PDFImportView._pending_imports.get(import_id)
        
        if not pending:
            return Response(
                {"error": "Import not found or expired. Please re-upload the PDF."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify user
        if pending['user_id'] != request.user.id:
            return Response(
                {"error": "Unauthorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get account
        try:
            account = Account.objects.get(id=pending['account_id'])
        except Account.DoesNotExist:
            return Response(
                {"error": "Account no longer exists"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use modified transactions if provided, otherwise use original
        transactions = modified_transactions if modified_transactions else pending['transactions']
        
        # Create transactions
        created_count = 0
        errors = []
        
        for txn in transactions:
            try:
                # Parse date
                try:
                    tx_date = datetime.strptime(txn['date'], '%Y-%m-%d').date()
                except (ValueError, KeyError):
                    tx_date = timezone.now().date()
                
                # Create transaction
                Transaction.objects.create(
                    account=account,
                    plaid_transaction_id=f"pdf_import_{uuid.uuid4()}",
                    amount=float(txn.get('amount', 0)),
                    name=txn.get('description', 'PDF Import')[:200],
                    merchant_name=txn.get('description', '')[:100],
                    primary_category=txn.get('category', 'OTHER'),
                    date=tx_date,
                    pending=False,
                    is_manual=True,
                )
                created_count += 1
                
            except Exception as e:
                errors.append(str(e))
        
        # Clean up pending import
        del PDFImportView._pending_imports[import_id]
        
        return Response({
            "status": "success",
            "transactions_created": created_count,
            "errors": errors,
        })
