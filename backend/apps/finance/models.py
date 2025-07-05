from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid

class Institution(models.Model):
    """Financial institution linked via Plaid"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='institutions')
    plaid_institution_id = models.CharField(max_length=100)
    name = models.CharField(max_length=200)
    logo_url = models.URLField(blank=True, null=True)
    primary_color = models.CharField(max_length=7, blank=True, null=True)  # Hex color
    url = models.URLField(blank=True, null=True)
    
    # Plaid connection data
    access_token = models.TextField()  # Encrypted in production
    item_id = models.CharField(max_length=100, unique=True)
    sync_cursor = models.TextField(blank=True, null=True)  # Plaid transaction sync cursor
    
    # Status tracking
    is_active = models.BooleanField(default=True)
    needs_update = models.BooleanField(default=False)
    last_successful_update = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'plaid_institution_id']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.user.username}"


class Account(models.Model):
    """Individual bank account or investment account"""
    ACCOUNT_TYPE_CHOICES = [
        ('depository', 'Depository'),
        ('credit', 'Credit'),
        ('loan', 'Loan'),
        ('investment', 'Investment'),
        ('other', 'Other'),
    ]
    
    ACCOUNT_SUBTYPE_CHOICES = [
        # Depository
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('cd', 'CD'),
        ('money_market', 'Money Market'),
        # Credit
        ('credit_card', 'Credit Card'),
        # Loan
        ('auto', 'Auto Loan'),
        ('business', 'Business Loan'),
        ('commercial', 'Commercial Loan'),
        ('construction', 'Construction Loan'),
        ('consumer', 'Consumer Loan'),
        ('home_equity', 'Home Equity'),
        ('line_of_credit', 'Line of Credit'),
        ('mortgage', 'Mortgage'),
        ('student', 'Student Loan'),
        # Investment
        ('401k', '401k'),
        ('403b', '403b'),
        ('457b', '457b'),
        ('529', '529'),
        ('brokerage', 'Brokerage'),
        ('cash_isa', 'Cash ISA'),
        ('education_savings', 'Education Savings'),
        ('hsa', 'HSA'),
        ('ira', 'IRA'),
        ('isa', 'ISA'),
        ('lif', 'LIF'),
        ('lira', 'LIRA'),
        ('lrif', 'LRIF'),
        ('lrsp', 'LRSP'),
        ('pension', 'Pension'),
        ('prif', 'PRIF'),
        ('retirement', 'Retirement'),
        ('rlif', 'RLIF'),
        ('roth', 'Roth IRA'),
        ('roth_401k', 'Roth 401k'),
        ('rrif', 'RRIF'),
        ('rrsp', 'RRSP'),
        ('sarsep', 'SARSEP'),
        ('sep_ira', 'SEP IRA'),
        ('simple_ira', 'Simple IRA'),
        ('sipp', 'SIPP'),
        ('stock_plan', 'Stock Plan'),
        ('tfsa', 'TFSA'),
        ('ugma', 'UGMA'),
        ('utma', 'UTMA'),
        ('variable_annuity', 'Variable Annuity'),
        # Other
        ('cash_management', 'Cash Management'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='accounts')
    plaid_account_id = models.CharField(max_length=100, unique=True)
    
    # Account info
    name = models.CharField(max_length=200)
    official_name = models.CharField(max_length=200, blank=True, null=True)
    mask = models.CharField(max_length=10, blank=True, null=True)  # Last 4 digits
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    subtype = models.CharField(max_length=30, choices=ACCOUNT_SUBTYPE_CHOICES)
    
    # Balances
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    iso_currency_code = models.CharField(max_length=3, default='USD')
    
    # Status
    is_active = models.BooleanField(default=True)
    is_selected = models.BooleanField(default=True)  # User can hide accounts
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['institution', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.mask})"
    
    @property
    def is_asset(self):
        """Returns True if this account represents an asset (positive balance is good)"""
        return self.type in ['depository', 'investment']
    
    @property
    def is_liability(self):
        """Returns True if this account represents a liability (positive balance is debt)"""
        return self.type in ['credit', 'loan']


class Transaction(models.Model):
    """Individual financial transaction"""
    TRANSACTION_TYPE_CHOICES = [
        ('special', 'Special'),
        ('place', 'Place'),
        ('digital', 'Digital'),
        ('unresolved', 'Unresolved'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    plaid_transaction_id = models.CharField(max_length=100, unique=True)
    
    # Transaction details
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    iso_currency_code = models.CharField(max_length=3, default='USD')
    name = models.CharField(max_length=500)
    merchant_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Categories from Plaid
    category = models.JSONField(default=list, blank=True, null=True)  # Array of category hierarchy
    primary_category = models.CharField(max_length=100, blank=True, null=True)
    detailed_category = models.CharField(max_length=200, blank=True, null=True)
    
    # Transaction metadata
    date = models.DateField()
    authorized_date = models.DateField(null=True, blank=True)
    datetime = models.DateTimeField(null=True, blank=True)
    
    # Payment info
    payment_channel = models.CharField(max_length=20)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, blank=True, null=True)
    
    # Location info
    location = models.JSONField(default=dict, blank=True)  # Contains address, city, region, etc.
    
    # Additional flags
    pending = models.BooleanField(default=False)
    pending_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    account_owner = models.CharField(max_length=200, blank=True, null=True)
    
    # User modifications
    user_category = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-datetime']
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['primary_category']),
            models.Index(fields=['account', '-date']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.amount} on {self.date}"


class SpendingCategory(models.Model):
    """User-defined spending categories for budgeting"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='spending_categories')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True, null=True)  # Icon name or emoji
    color = models.CharField(max_length=7, default='#6B7280')  # Hex color
    
    # Budget info
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Plaid category mappings
    plaid_categories = models.JSONField(default=list)  # List of Plaid categories that map to this
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'name']
        ordering = ['name']
    
    def __str__(self):
        return self.name


class MonthlySpending(models.Model):
    """Aggregated monthly spending by category"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monthly_spending')
    category = models.ForeignKey(SpendingCategory, on_delete=models.CASCADE, related_name='monthly_totals')
    
    # Period
    year = models.IntegerField()
    month = models.IntegerField()
    
    # Amounts
    amount_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transaction_count = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'category', 'year', 'month']
        ordering = ['-year', '-month', 'category']
    
    def __str__(self):
        return f"{self.category.name} - {self.year}/{self.month}: ${self.amount_spent}"


class NetWorthSnapshot(models.Model):
    """Daily snapshot of user's net worth"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='networth_snapshots')
    date = models.DateField()
    
    # Totals
    total_assets = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_liabilities = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_worth = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Breakdown by type
    cash_and_investments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_cards = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loans = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.username} - {self.date}: ${self.net_worth}"


class PlaidWebhook(models.Model):
    """Track Plaid webhook events"""
    WEBHOOK_TYPE_CHOICES = [
        ('TRANSACTIONS', 'Transactions'),
        ('ITEM', 'Item'),
        ('ACCOUNTS', 'Accounts'),
        ('HOLDINGS', 'Holdings'),
        ('INVESTMENTS_TRANSACTIONS', 'Investment Transactions'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webhook_type = models.CharField(max_length=30, choices=WEBHOOK_TYPE_CHOICES)
    webhook_code = models.CharField(max_length=50)
    item_id = models.CharField(max_length=100)
    
    # Webhook data
    payload = models.JSONField()
    error = models.JSONField(null=True, blank=True)
    
    # Processing status
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['item_id']),
            models.Index(fields=['webhook_type']),
            models.Index(fields=['processed']),
        ]
    
    def __str__(self):
        return f"{self.webhook_type}: {self.webhook_code} - {self.item_id}"


class Security(models.Model):
    """Security (stock, bond, etc.) metadata from Plaid"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plaid_security_id = models.CharField(max_length=100, unique=True)
    
    # Basic security info
    name = models.CharField(max_length=200)
    ticker_symbol = models.CharField(max_length=20, blank=True, null=True)
    cusip = models.CharField(max_length=20, blank=True, null=True)
    isin = models.CharField(max_length=20, blank=True, null=True)
    sedol = models.CharField(max_length=20, blank=True, null=True)
    
    # Security type and classification
    type = models.CharField(max_length=50, blank=True, null=True)  # e.g., 'equity', 'etf', 'mutual_fund'
    close_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    close_price_as_of = models.DateField(null=True, blank=True)
    
    # Additional metadata
    institution_id = models.CharField(max_length=100, blank=True, null=True)
    institution_security_id = models.CharField(max_length=100, blank=True, null=True)
    is_cash_equivalent = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['ticker_symbol', 'name']
    
    def __str__(self):
        if self.ticker_symbol:
            return f"{self.ticker_symbol} - {self.name}"
        return self.name


class Holding(models.Model):
    """Investment holding (position) in a specific security"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='holdings')
    security = models.ForeignKey(Security, on_delete=models.CASCADE, related_name='holdings')
    
    # Position details
    quantity = models.DecimalField(max_digits=18, decimal_places=8)  # Number of shares/units
    institution_price = models.DecimalField(max_digits=12, decimal_places=4)  # Price per share
    institution_price_as_of = models.DateField(null=True, blank=True)
    institution_value = models.DecimalField(max_digits=12, decimal_places=2)  # Total position value
    
    # Cost basis (if available)
    cost_basis = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # ISO currency
    iso_currency_code = models.CharField(max_length=3, default='USD')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['account', 'security']
        ordering = ['-institution_value']
    
    def __str__(self):
        return f"{self.security.ticker_symbol or self.security.name} - {self.quantity} shares"
    
    @property
    def unrealized_gain_loss(self):
        """Calculate unrealized gain/loss if cost basis is available"""
        if self.cost_basis:
            return self.institution_value - self.cost_basis
        return None
    
    @property
    def unrealized_gain_loss_percent(self):
        """Calculate unrealized gain/loss percentage"""
        if self.cost_basis and self.cost_basis > 0:
            return ((self.institution_value - self.cost_basis) / self.cost_basis) * 100
        return None


class InvestmentTransaction(models.Model):
    """Investment transaction (buy, sell, dividend, etc.)"""
    TRANSACTION_TYPE_CHOICES = [
        ('buy', 'Buy'),
        ('sell', 'Sell'),
        ('dividend', 'Dividend'),
        ('interest', 'Interest'),
        ('fee', 'Fee'),
        ('tax', 'Tax'),
        ('transfer', 'Transfer'),
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('other', 'Other'),
    ]
    
    SUBTYPE_CHOICES = [
        ('account_fee', 'Account Fee'),
        ('adjustment', 'Adjustment'),
        ('assignment', 'Assignment'),
        ('buy', 'Buy'),
        ('buy_cover', 'Buy to Cover'),
        ('contribution', 'Contribution'),
        ('deposit', 'Deposit'),
        ('distribution', 'Distribution'),
        ('dividend', 'Dividend'),
        ('dividend_reinvestment', 'Dividend Reinvestment'),
        ('exercise', 'Exercise'),
        ('expire', 'Expire'),
        ('fund_fee', 'Fund Fee'),
        ('interest', 'Interest'),
        ('interest_receivable', 'Interest Receivable'),
        ('interest_reinvestment', 'Interest Reinvestment'),
        ('legal_fee', 'Legal Fee'),
        ('loan_payment', 'Loan Payment'),
        ('long_term_capital_gain', 'Long Term Capital Gain'),
        ('long_term_capital_gain_reinvestment', 'Long Term Capital Gain Reinvestment'),
        ('management_fee', 'Management Fee'),
        ('margin_expense', 'Margin Expense'),
        ('merger', 'Merger'),
        ('miscellaneous_fee', 'Miscellaneous Fee'),
        ('non_qualified_dividend', 'Non Qualified Dividend'),
        ('non_resident_tax', 'Non Resident Tax'),
        ('pending_credit', 'Pending Credit'),
        ('pending_debit', 'Pending Debit'),
        ('qualified_dividend', 'Qualified Dividend'),
        ('rebalance', 'Rebalance'),
        ('return_of_principal', 'Return of Principal'),
        ('sell', 'Sell'),
        ('sell_short', 'Sell Short'),
        ('send', 'Send'),
        ('short_term_capital_gain', 'Short Term Capital Gain'),
        ('short_term_capital_gain_reinvestment', 'Short Term Capital Gain Reinvestment'),
        ('spin_off', 'Spin Off'),
        ('split', 'Split'),
        ('stock_distribution', 'Stock Distribution'),
        ('tax', 'Tax'),
        ('tax_withheld', 'Tax Withheld'),
        ('trade', 'Trade'),
        ('transfer', 'Transfer'),
        ('transfer_fee', 'Transfer Fee'),
        ('trust_fee', 'Trust Fee'),
        ('unqualified_gain', 'Unqualified Gain'),
        ('withdrawal', 'Withdrawal'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='investment_transactions')
    plaid_investment_transaction_id = models.CharField(max_length=100, unique=True)
    
    # Security (optional - some transactions like fees don't have securities)
    security = models.ForeignKey(Security, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    
    # Transaction details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    fees = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Transaction type
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    subtype = models.CharField(max_length=50, choices=SUBTYPE_CHOICES)
    
    # Dates
    date = models.DateField()
    name = models.CharField(max_length=500)
    
    # Currency
    iso_currency_code = models.CharField(max_length=3, default='USD')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['account']),
            models.Index(fields=['type']),
        ]
    
    def __str__(self):
        return f"{self.type}: {self.name} - ${self.amount}"
