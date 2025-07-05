from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InstitutionViewSet,
    AccountViewSet,
    TransactionViewSet,
    SpendingCategoryViewSet,
    HoldingViewSet,
    InvestmentTransactionViewSet,
    CreateLinkTokenView,
    ExchangePublicTokenView,
    DashboardView,
    MonthlySpendingView,
    NetWorthTrendView,
    PlaidWebhookView
)

router = DefaultRouter()
router.register(r'institutions', InstitutionViewSet, basename='institution')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'spending-categories', SpendingCategoryViewSet, basename='spendingcategory')
router.register(r'holdings', HoldingViewSet, basename='holding')
router.register(r'investment-transactions', InvestmentTransactionViewSet, basename='investmenttransaction')

urlpatterns = [
    path('', include(router.urls)),
    path('plaid/create-link-token/', CreateLinkTokenView.as_view(), name='plaid-create-link-token'),
    path('plaid/exchange-public-token/', ExchangePublicTokenView.as_view(), name='plaid-exchange-public-token'),
    path('plaid/webhook/', PlaidWebhookView.as_view(), name='plaid-webhook'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('reports/monthly-spending/', MonthlySpendingView.as_view(), name='monthly-spending'),
    path('reports/net-worth-trend/', NetWorthTrendView.as_view(), name='net-worth-trend'),
] 