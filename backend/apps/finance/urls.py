from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InstitutionViewSet,
    AccountViewSet,
    TransactionViewSet,
    SpendingCategoryViewSet,
    RecurringTransactionViewSet,
    HoldingViewSet,
    InvestmentTransactionViewSet,
    CreateLinkTokenView,
    ExchangePublicTokenView,
    CreateManualAccountView,
    DashboardView,
    MonthlySpendingView,
    NetWorthTrendView,
    PlaidWebhookView,
    CSVImportView,
    PDFImportView,
    PDFImportConfirmView
)

router = DefaultRouter()
router.register(r'institutions', InstitutionViewSet, basename='institution')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'spending-categories', SpendingCategoryViewSet, basename='spendingcategory')
router.register(r'recurring-transactions', RecurringTransactionViewSet, basename='recurringtransaction')
router.register(r'holdings', HoldingViewSet, basename='holding')
router.register(r'investment-transactions', InvestmentTransactionViewSet, basename='investmenttransaction')

urlpatterns = [
    path('', include(router.urls)),
    path('plaid/create-link-token/', CreateLinkTokenView.as_view(), name='plaid-create-link-token'),
    path('plaid/exchange-public-token/', ExchangePublicTokenView.as_view(), name='plaid-exchange-public-token'),
    path('plaid/webhook/', PlaidWebhookView.as_view(), name='plaid-webhook'),
    path('manual-accounts/create/', CreateManualAccountView.as_view(), name='create-manual-account'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('reports/monthly-spending/', MonthlySpendingView.as_view(), name='monthly-spending'),
    path('reports/net-worth-trend/', NetWorthTrendView.as_view(), name='net-worth-trend'),
    path('import/csv/', CSVImportView.as_view(), name='csv-import'),
    path('import/pdf/', PDFImportView.as_view(), name='pdf-import'),
    path('import/pdf/confirm/', PDFImportConfirmView.as_view(), name='pdf-import-confirm'),
] 