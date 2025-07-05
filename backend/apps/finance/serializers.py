from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Institution, Account, Transaction, SpendingCategory, 
    MonthlySpending, NetWorthSnapshot, PlaidWebhook,
    Security, Holding, InvestmentTransaction
)


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model"""
    balance_display = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    subtype_display = serializers.CharField(source='get_subtype_display', read_only=True)
    
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'official_name', 'mask', 'type', 'subtype',
            'type_display', 'subtype_display', 'current_balance', 
            'available_balance', 'limit', 'iso_currency_code',
            'is_active', 'is_selected', 'is_asset', 'is_liability',
            'balance_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_asset', 'is_liability']
    
    def get_balance_display(self, obj):
        """Format balance for display"""
        if obj.is_liability:
            # For credit cards and loans, show as negative
            return f"-${abs(obj.current_balance):,.2f}"
        return f"${obj.current_balance:,.2f}"


class InstitutionSerializer(serializers.ModelSerializer):
    """Serializer for Institution model"""
    accounts = AccountSerializer(many=True, read_only=True)
    total_balance = serializers.SerializerMethodField()
    account_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Institution
        fields = [
            'id', 'name', 'logo_url', 'primary_color', 'url',
            'is_active', 'needs_update', 'last_successful_update',
            'error_message', 'accounts', 'total_balance', 'account_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'plaid_institution_id',
            'access_token', 'item_id'
        ]
    
    def get_total_balance(self, obj):
        """Calculate total balance across all accounts"""
        total = sum(
            acc.current_balance if acc.is_asset else -acc.current_balance 
            for acc in obj.accounts.filter(is_active=True, is_selected=True)
        )
        return f"${total:,.2f}"
    
    def get_account_count(self, obj):
        """Count active accounts"""
        return obj.accounts.filter(is_active=True).count()


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model"""
    account_name = serializers.CharField(source='account.name', read_only=True)
    institution_name = serializers.CharField(source='account.institution.name', read_only=True)
    amount_display = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'account', 'account_name', 'institution_name',
            'amount', 'amount_display', 'iso_currency_code', 'name',
            'merchant_name', 'category', 'primary_category', 'detailed_category',
            'category_display', 'date', 'authorized_date', 'datetime',
            'payment_channel', 'transaction_type', 'location',
            'pending', 'user_category', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'plaid_transaction_id',
            'account_name', 'institution_name'
        ]
    
    def get_amount_display(self, obj):
        """Format amount for display"""
        # In Plaid, positive amounts are debits (money out)
        # Negative amounts are credits (money in)
        if obj.amount > 0:
            return f"-${obj.amount:,.2f}"
        else:
            return f"+${abs(obj.amount):,.2f}"
    
    def get_category_display(self, obj):
        """Get human-readable category"""
        if obj.user_category:
            return obj.user_category
        if obj.primary_category:
            return obj.primary_category.replace('_', ' ').title()
        return 'Uncategorized'


class SpendingCategorySerializer(serializers.ModelSerializer):
    """Serializer for SpendingCategory model"""
    current_month_spending = serializers.SerializerMethodField()
    budget_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = SpendingCategory
        fields = [
            'id', 'name', 'icon', 'color', 'monthly_budget',
            'plaid_categories', 'current_month_spending', 'budget_remaining',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_current_month_spending(self, obj):
        """Get current month's spending for this category"""
        from django.utils import timezone
        now = timezone.now()
        
        try:
            monthly = obj.monthly_totals.get(year=now.year, month=now.month)
            return monthly.amount_spent
        except MonthlySpending.DoesNotExist:
            return 0
    
    def get_budget_remaining(self, obj):
        """Calculate remaining budget for current month"""
        if not obj.monthly_budget:
            return None
        
        spent = self.get_current_month_spending(obj)
        remaining = obj.monthly_budget - spent
        return {
            'amount': remaining,
            'percentage': (remaining / obj.monthly_budget * 100) if obj.monthly_budget else 0,
            'is_over': remaining < 0
        }


class MonthlySpendingSerializer(serializers.ModelSerializer):
    """Serializer for MonthlySpending model"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    budget = serializers.DecimalField(
        source='category.monthly_budget',
        max_digits=10, 
        decimal_places=2, 
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = MonthlySpending
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'year', 'month', 'amount_spent', 'transaction_count', 'budget',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NetWorthSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for NetWorthSnapshot model"""
    change_from_previous = serializers.SerializerMethodField()
    
    class Meta:
        model = NetWorthSnapshot
        fields = [
            'id', 'date', 'total_assets', 'total_liabilities', 'net_worth',
            'cash_and_investments', 'credit_cards', 'loans',
            'change_from_previous', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_change_from_previous(self, obj):
        """Calculate change from previous snapshot"""
        previous = NetWorthSnapshot.objects.filter(
            user=obj.user,
            date__lt=obj.date
        ).order_by('-date').first()
        
        if not previous:
            return None
        
        return {
            'amount': obj.net_worth - previous.net_worth,
            'percentage': ((obj.net_worth - previous.net_worth) / previous.net_worth * 100) if previous.net_worth else 0,
            'days_ago': (obj.date - previous.date).days
        }


class SecuritySerializer(serializers.ModelSerializer):
    """Serializer for Security model"""
    price_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Security
        fields = [
            'id', 'name', 'ticker_symbol', 'cusip', 'isin', 'sedol',
            'type', 'close_price', 'close_price_as_of', 'price_display',
            'is_cash_equivalent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_price_display(self, obj):
        """Format price for display"""
        if obj.close_price:
            return f"${obj.close_price:,.2f}"
        return "N/A"


class HoldingSerializer(serializers.ModelSerializer):
    """Serializer for Holding model"""
    security = SecuritySerializer(read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    value_display = serializers.SerializerMethodField()
    quantity_display = serializers.SerializerMethodField()
    gain_loss_display = serializers.SerializerMethodField()
    gain_loss_percent_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Holding
        fields = [
            'id', 'account', 'account_name', 'security', 'quantity',
            'quantity_display', 'institution_price', 'institution_price_as_of',
            'institution_value', 'value_display', 'cost_basis',
            'unrealized_gain_loss', 'unrealized_gain_loss_percent',
            'gain_loss_display', 'gain_loss_percent_display',
            'iso_currency_code', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_value_display(self, obj):
        """Format value for display"""
        return f"${obj.institution_value:,.2f}"
    
    def get_quantity_display(self, obj):
        """Format quantity for display"""
        return f"{obj.quantity:,.4f}".rstrip('0').rstrip('.')
    
    def get_gain_loss_display(self, obj):
        """Format gain/loss for display"""
        gain_loss = obj.unrealized_gain_loss
        if gain_loss is not None:
            sign = "+" if gain_loss >= 0 else ""
            return f"{sign}${gain_loss:,.2f}"
        return "N/A"
    
    def get_gain_loss_percent_display(self, obj):
        """Format gain/loss percentage for display"""
        gain_loss_percent = obj.unrealized_gain_loss_percent
        if gain_loss_percent is not None:
            sign = "+" if gain_loss_percent >= 0 else ""
            return f"{sign}{gain_loss_percent:.2f}%"
        return "N/A"


class InvestmentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for InvestmentTransaction model"""
    security = SecuritySerializer(read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    amount_display = serializers.SerializerMethodField()
    quantity_display = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    subtype_display = serializers.CharField(source='get_subtype_display', read_only=True)
    
    class Meta:
        model = InvestmentTransaction
        fields = [
            'id', 'account', 'account_name', 'security', 'amount',
            'amount_display', 'quantity', 'quantity_display', 'price',
            'price_display', 'fees', 'type', 'type_display',
            'subtype', 'subtype_display', 'date', 'name',
            'iso_currency_code', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_amount_display(self, obj):
        """Format amount for display"""
        return f"${obj.amount:,.2f}"
    
    def get_quantity_display(self, obj):
        """Format quantity for display"""
        if obj.quantity:
            return f"{obj.quantity:,.4f}".rstrip('0').rstrip('.')
        return "N/A"
    
    def get_price_display(self, obj):
        """Format price for display"""
        if obj.price:
            return f"${obj.price:,.2f}"
        return "N/A"


# Plaid-specific serializers
class PlaidLinkTokenSerializer(serializers.Serializer):
    """Serializer for Plaid Link token creation"""
    redirect_uri = serializers.URLField(required=False, allow_null=True)


class PlaidPublicTokenExchangeSerializer(serializers.Serializer):
    """Serializer for exchanging public token"""
    public_token = serializers.CharField(required=True)
    institution_id = serializers.CharField(required=True)
    institution_name = serializers.CharField(required=True)
    accounts = serializers.JSONField(required=True)


class PlaidWebhookSerializer(serializers.ModelSerializer):
    """Serializer for PlaidWebhook model"""
    class Meta:
        model = PlaidWebhook
        fields = [
            'id', 'webhook_type', 'webhook_code', 'item_id',
            'payload', 'error', 'processed', 'processed_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'processed', 'processed_at']


# Dashboard serializers
class DashboardSerializer(serializers.Serializer):
    """Serializer for dashboard overview data"""
    net_worth = serializers.JSONField()  # More flexible field type that accepts various data types
    total_assets = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_liabilities = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    net_worth_as_of = serializers.DateTimeField(required=False)
    institutions = InstitutionSerializer(many=True)
    recent_transactions = TransactionSerializer(many=True)
    spending_by_category = serializers.ListField()
    monthly_cash_flow = serializers.DictField()
    net_worth_trend = NetWorthSnapshotSerializer(many=True) 