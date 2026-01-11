import plaid
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
import logging
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from plaid.exceptions import ApiException

logger = logging.getLogger(__name__)


class PlaidService:
    """Service class for interacting with Plaid API"""
    
    def __init__(self):
        # Use the correct secret based on environment
        if settings.PLAID_ENV.lower() == 'production':
            secret_key = settings.PLAID_SECRET_PRODUCTION
        else:
            secret_key = settings.PLAID_SECRET_SANDBOX
        
        # Map environment names to Plaid Environment attributes
        # Note: 'development' in Plaid uses the same host as 'sandbox' but connects to real banks
        env_mapping = {
            'sandbox': 'Sandbox',
            'development': 'Sandbox',  # Development uses sandbox host but real bank connections
            'production': 'Production'
        }
        plaid_env = env_mapping.get(settings.PLAID_ENV.lower(), 'Sandbox')
            
        configuration = plaid.Configuration(
            host=getattr(plaid.Environment, plaid_env),
            api_key={
                'clientId': settings.PLAID_CLIENT_ID,
                'secret': secret_key,
            }
        )
        api_client = plaid.ApiClient(configuration)
        self.client = plaid_api.PlaidApi(api_client)
    
    def create_link_token(self, user, redirect_uri=None, include_investments=False):
        """Create a Plaid Link token for user authentication"""
        try:
            # Start with basic transactions product
            products_list = [Products('transactions')]
            
            # Add investments product if requested
            if include_investments:
                products_list.append(Products('investments'))

            # Prepare arguments for LinkTokenCreateRequest
            link_token_args = {
                "client_name": 'Samaanai Finance',
                "country_codes": [CountryCode('US')],
                "language": 'en',
                "user": {
                    'client_user_id': str(user.id),
                    'email_address': user.email,
                },
                "products": products_list,
                # Use a simple dictionary instead of LinkTokenCreateRequestTransactions
                "transactions": {
                    # Request up to 730 days so that the initial /transactions/sync delivers two years of data
                    "days_requested": 730
                }
            }
            
            # Add investments configuration if investments product is included
            if include_investments:
                # Don't add account_subtypes as it's not supported by Plaid API
                pass
            
            if redirect_uri:
                link_token_args['redirect_uri'] = redirect_uri
            
            webhook_url = getattr(settings, 'PLAID_WEBHOOK_URL', None)
            if webhook_url:
                if getattr(settings, 'PLAID_WEBHOOK_SECRET', None):
                    parsed = urlparse(webhook_url)
                    query = parse_qs(parsed.query, keep_blank_values=True)
                    query['secret'] = [settings.PLAID_WEBHOOK_SECRET]
                    webhook_url = urlunparse(
                        parsed._replace(query=urlencode(query, doseq=True))
                    )
                link_token_args['webhook'] = webhook_url
                logger.info(f"Setting webhook URL for Plaid Link: {webhook_url}")
            else:
                logger.warning("PLAID_WEBHOOK_URL is not set in Django settings. Webhooks will not be configured for Plaid Link.")

            request = LinkTokenCreateRequest(**link_token_args)
            
            response = self.client.link_token_create(request)

            return {
                'link_token': response['link_token'],
                'expiration': response['expiration'],
            }
        except plaid.ApiException as e:
            logger.error(f"Plaid API Exception during link_token_create for user {user.id}: {e.body}") 
            raise 
        except Exception as e:
            logger.error(f"Unexpected error during link_token_create for user {user.id}: {e}")
            raise
    
    def exchange_public_token(self, public_token):
        """Exchange public token for access token"""
        try:
            request = ItemPublicTokenExchangeRequest(
                public_token=public_token
            )
            response = self.client.item_public_token_exchange(request)
            return {
                'access_token': response['access_token'],
                'item_id': response['item_id'],
            }
        except plaid.ApiException as e:
            logger.error(f"Error exchanging public token: {e}")
            raise
    
    def get_accounts(self, access_token):
        """Get all accounts for an item"""
        try:
            request = AccountsGetRequest(access_token=access_token)
            response = self.client.accounts_get(request)
            return response['accounts']
        except plaid.ApiException as e:
            logger.error(f"Error getting accounts: {e}")
            raise
    
    def get_institution(self, institution_id):
        """Get institution details by ID"""
        try:
            request = InstitutionsGetByIdRequest(
                institution_id=institution_id,
                country_codes=[CountryCode('US')],
            )
            response = self.client.institutions_get_by_id(request)
            return response['institution']
        except plaid.ApiException as e:
            logger.error(f"Error getting institution: {e}")
            raise
    
    def sync_transactions(self, access_token, cursor=None):
        """Sync transactions using the new transactions sync endpoint"""
        try:
            request_args = {
                'access_token': access_token,
            }
            if cursor:  # Only add cursor to request_args if it's not None or empty
                request_args['cursor'] = cursor
            
            request = TransactionsSyncRequest(**request_args) # Pass args this way
            
            response = self.client.transactions_sync(request)
            return {
                'added': response['added'],
                'modified': response['modified'],
                'removed': response['removed'],
                'next_cursor': response['next_cursor'],
                'has_more': response['has_more'],
            }
        except plaid.ApiException as e:
            logger.error(f"Plaid API Exception during transaction sync: {e.body}") # Log e.body
            raise
        except Exception as e:
            logger.error(f"Unexpected error syncing transactions: {e}")
            raise
    
    def get_transactions(self, access_token, start_date, end_date, account_ids=None):
        """Get transactions for a date range (fallback method)"""
        try:
            request_params = {
                'access_token': access_token,
                'start_date': start_date,
                'end_date': end_date,
                # Ask for the maximum count per Plaid docs (500)
                'options': {
                    'count': 500,
                    'offset': 0
                }
            }
            if account_ids is not None:
                request_params['account_ids'] = account_ids

            all_transactions = []
            total_transactions = None

            while True:
                request = TransactionsGetRequest(**request_params)
                response = self.client.transactions_get(request)

                if total_transactions is None:
                    total_transactions = response['total_transactions']

                all_transactions.extend(response['transactions'])

                logger.info(
                    f"Fetched {len(all_transactions)} / {total_transactions} transactions so far (offset {request_params['options']['offset']})"
                )

                # Break when we've fetched everything
                if len(all_transactions) >= total_transactions:
                    break

                # Otherwise update offset and loop again
                request_params['options']['offset'] = len(all_transactions)

            logger.info(f"Retrieved all {len(all_transactions)} transactions for date range {start_date} -> {end_date}")
            return all_transactions
            
        except plaid.ApiException as e:
            logger.error(f"Error getting transactions: {e}")
            raise
    
    def update_account_balances(self, access_token):
        """Update account balances using accounts/get endpoint (included with transactions product)"""
        try:
            # Use get_accounts instead of balance-specific endpoint
            accounts_data = self.get_accounts(access_token)
            return accounts_data
        except plaid.ApiException as e:
            logger.error(f"Error updating balances: {e}")
            raise
    
    def get_item_status(self, access_token):
        """Get item status to check for errors"""
        try:
            response = self.client.item_get(access_token)
            return response['item']
        except plaid.ApiException as e:
            logger.error(f"Error getting item status: {e}")
            raise
    
    def remove_item(self, access_token):
        """Remove an item (unlink institution)"""
        try:
            response = self.client.item_remove(access_token)
            return response
        except plaid.ApiException as e:
            logger.error(f"Error removing item: {e}")
            raise
    
    def get_investments_holdings(self, access_token):
        """Get investment holdings for an institution"""
        try:
            request = InvestmentsHoldingsGetRequest(access_token=access_token)
            response = self.client.investments_holdings_get(request)
            return {
                'holdings': response['holdings'],
                'securities': response['securities'],
                'accounts': response['accounts']
            }
        except plaid.ApiException as e:
            logger.error(f"Error getting investment holdings: {e}")
            raise
    
    def get_investments_transactions(self, access_token, start_date, end_date):
        """Get investment transactions for a date range"""
        try:
            request = InvestmentsTransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date
            )
            response = self.client.investments_transactions_get(request)
            
            transactions = response['investment_transactions']
            total_transactions = response['total_investment_transactions']
            
            # Get all transactions if there are more
            while len(transactions) < total_transactions:
                request = InvestmentsTransactionsGetRequest(
                    access_token=access_token,
                    start_date=start_date,
                    end_date=end_date,
                    offset=len(transactions)
                )
                response = self.client.investments_transactions_get(request)
                transactions.extend(response['investment_transactions'])
            
            return {
                'investment_transactions': transactions,
                'securities': response['securities'],
                'accounts': response['accounts']
            }
        except plaid.ApiException as e:
            logger.error(f"Error getting investment transactions: {e}")
            raise


class TransactionSyncService:
    """Service for syncing and processing transactions"""
    
    def __init__(self):
        self.plaid_service = PlaidService()
    
    def sync_institution_transactions(self, institution):
        """Sync all transactions for an institution"""
        from .models import Transaction, Account
        
        # Determine if this is the very first sync for the Plaid item
        initial_cursor = institution.sync_cursor if hasattr(institution, 'sync_cursor') else None

        cursor = initial_cursor  # working cursor for the loop
        has_more = True
        transactions_synced = 0
        
        logger.info(f"Starting transaction sync for institution {institution.name} (ID: {institution.id})")
        logger.info(f"Initial cursor: {cursor}")
        
        while has_more:
            try:
                result = self.plaid_service.sync_transactions(
                    institution.access_token,
                    cursor
                )
                
                logger.info(f"Plaid sync result: added={len(result['added'])}, modified={len(result['modified'])}, removed={len(result['removed'])}, has_more={result['has_more']}")
                
                # Process added transactions
                for trans_data in result['added']:
                    try:
                        account = Account.objects.get(
                            plaid_account_id=trans_data['account_id']
                        )
                        
                        transaction, created = Transaction.objects.update_or_create(
                            plaid_transaction_id=trans_data['transaction_id'],
                            defaults={
                                'account': account,
                                'amount': trans_data['amount'],
                                'iso_currency_code': trans_data.get('iso_currency_code', 'USD'),
                                'name': trans_data['name'],
                                'merchant_name': trans_data.get('merchant_name'),
                                # Handle both old and new category formats from Plaid
                                'category': trans_data.get('category', []) or (
                                    [trans_data['personal_finance_category']['primary']] 
                                    if trans_data.get('personal_finance_category') and trans_data['personal_finance_category'].get('primary')
                                    else []
                                ),
                                'primary_category': (
                                    trans_data.get('category', [''])[0] if trans_data.get('category') 
                                    else trans_data['personal_finance_category']['primary'] if trans_data.get('personal_finance_category') and trans_data['personal_finance_category'].get('primary')
                                    else None
                                ),
                                'detailed_category': (
                                    trans_data.get('detailed_category') or
                                    trans_data['personal_finance_category']['detailed'] if trans_data.get('personal_finance_category') and trans_data['personal_finance_category'].get('detailed')
                                    else None
                                ),
                                'date': trans_data['date'],
                                'authorized_date': trans_data.get('authorized_date'),
                                'datetime': trans_data.get('datetime'),
                                'payment_channel': trans_data.get('payment_channel', 'other'),
                                'transaction_type': trans_data.get('transaction_type'),
                                'location': trans_data.get('location').to_dict() if trans_data.get('location') and hasattr(trans_data.get('location'), 'to_dict') else trans_data.get('location', {}),
                                'pending': trans_data.get('pending', False),
                                'pending_transaction_id': trans_data.get('pending_transaction_id'),
                                'account_owner': trans_data.get('account_owner'),
                            }
                        )
                        if created:
                            transactions_synced += 1
                            logger.info(f"Created transaction: {transaction.name} - ${transaction.amount}")
                        
                    except Account.DoesNotExist:
                        logger.warning(f"Account not found for transaction: {trans_data['account_id']}")
                    except Exception as e:
                        logger.error(f"Error processing transaction {trans_data.get('transaction_id', 'unknown')}: {e}")
                
                # Process modified transactions
                for trans_data in result['modified']:
                    try:
                        trans = Transaction.objects.get(
                            plaid_transaction_id=trans_data['transaction_id']
                        )
                        # Update transaction fields
                        trans.amount = trans_data['amount']
                        trans.name = trans_data['name']
                        trans.pending = trans_data.get('pending', False)
                        trans.save()
                        logger.info(f"Updated transaction: {trans.name}")
                    except Transaction.DoesNotExist:
                        logger.warning(f"Transaction not found for modification: {trans_data['transaction_id']}")
                
                # Process removed transactions
                for trans_data in result['removed']:
                    deleted_count = Transaction.objects.filter(
                        plaid_transaction_id=trans_data['transaction_id']
                    ).delete()[0]
                    if deleted_count > 0:
                        logger.info(f"Removed transaction: {trans_data['transaction_id']}")
                
                cursor = result['next_cursor']
                has_more = result['has_more']
                
                # Save cursor to institution for next sync
                if hasattr(institution, 'sync_cursor'):
                    institution.sync_cursor = cursor
                    institution.save()
            
            except ApiException as e:
                # Handle Plaid pagination mutation error by restarting from last saved cursor
                if "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" in str(e.body):
                    logger.warning("Plaid mutation during pagination – restarting sync from saved cursor")
                    # Reset cursor to institution.sync_cursor (may be None) and retry once
                    cursor = institution.sync_cursor if hasattr(institution, 'sync_cursor') else None
                    has_more = True
                    continue
                # Handle stale cursor error - reset cursor and restart from beginning
                elif "cursor not associated with access_token" in str(e.body) or "INVALID_FIELD" in str(e.body):
                    logger.warning(f"Cursor not associated with access_token for institution {institution.id} - resetting cursor and retrying")
                    # Clear the stale cursor
                    if hasattr(institution, 'sync_cursor'):
                        institution.sync_cursor = None
                        institution.save()
                    cursor = None
                    has_more = True
                    continue
                else:
                    logger.error(f"Plaid ApiException for institution {institution.id}: {e.body}")
                    raise
            except Exception as e:
                logger.error(f"Error syncing transactions for institution {institution.id}: {e}")
                logger.exception("Full exception details:")
                raise
        
        # If this was the very first sync (no cursor existed before), fetch up to 730 days of
        # historical data using Plaid's /transactions/get endpoint. This ensures we seed the
        # database with ~2 years of history the very first time an institution is added.
        # We run this irrespective of how many transactions were added during the sync loop –
        # duplicates are handled via update_or_create.
        if not initial_cursor:
            logger.info("First-time sync detected; fetching up to 730 days of historical transactions via fallback method")
            try:
                from datetime import datetime, timedelta
                end_date = datetime.now().date()
                start_date = end_date - timedelta(days=730)  # Get last 2 years instead of 6 months
                
                transactions_data = self.plaid_service.get_transactions(
                    institution.access_token,
                    start_date,
                    end_date
                )
                
                logger.info(f"Fallback method returned {len(transactions_data)} transactions")
                
                for trans_data in transactions_data:
                    try:
                        account = Account.objects.get(
                            plaid_account_id=trans_data['account_id']
                        )
                        
                        transaction, created = Transaction.objects.update_or_create(
                            plaid_transaction_id=trans_data['transaction_id'],
                            defaults={
                                'account': account,
                                'amount': trans_data['amount'],
                                'iso_currency_code': trans_data.get('iso_currency_code', 'USD'),
                                'name': trans_data['name'],
                                'merchant_name': trans_data.get('merchant_name'),
                                # Handle both old and new category formats from Plaid
                                'category': trans_data.get('category', []) or (
                                    [trans_data['personal_finance_category']['primary']] 
                                    if trans_data.get('personal_finance_category') and trans_data['personal_finance_category'].get('primary')
                                    else []
                                ),
                                'primary_category': (
                                    trans_data.get('category', [''])[0] if trans_data.get('category') 
                                    else trans_data['personal_finance_category']['primary'] if trans_data.get('personal_finance_category') and trans_data['personal_finance_category'].get('primary')
                                    else None
                                ),
                                'detailed_category': (
                                    trans_data.get('detailed_category') or
                                    trans_data['personal_finance_category']['detailed'] if trans_data.get('personal_finance_category') and trans_data['personal_finance_category'].get('detailed')
                                    else None
                                ),
                                'date': trans_data['date'],
                                'authorized_date': trans_data.get('authorized_date'),
                                'datetime': trans_data.get('datetime'),
                                'payment_channel': trans_data.get('payment_channel', 'other'),
                                'transaction_type': trans_data.get('transaction_type'),
                                'location': trans_data.get('location').to_dict() if trans_data.get('location') and hasattr(trans_data.get('location'), 'to_dict') else trans_data.get('location', {}),
                                'pending': trans_data.get('pending', False),
                                'pending_transaction_id': trans_data.get('pending_transaction_id'),
                                'account_owner': trans_data.get('account_owner'),
                            }
                        )
                        if created:
                            transactions_synced += 1
                            logger.info(f"Created transaction via fallback: {transaction.name} - ${transaction.amount}")
                    except Account.DoesNotExist:
                        logger.warning(f"Account not found for fallback transaction: {trans_data['account_id']}")
                    except Exception as e:
                        logger.error(f"Error processing fallback transaction {trans_data.get('transaction_id', 'unknown')}: {e}")
                        
            except Exception as e:
                logger.error(f"Error in fallback transaction fetch: {e}")
        
        # Update institution last sync time
        institution.last_successful_update = timezone.now()
        institution.save()
        
        logger.info(f"Transaction sync completed for {institution.name}. Total synced: {transactions_synced}")
        
        return True


class InvestmentSyncService:
    """Service for syncing investment holdings and transactions"""
    
    def __init__(self):
        self.plaid_service = PlaidService()
    
    def sync_institution_holdings(self, institution):
        """Sync investment holdings for an institution"""
        from .models import Account, Security, Holding
        
        try:
            # Only sync for investment accounts
            investment_accounts = Account.objects.filter(
                institution=institution,
                type='investment'
            )
            
            if not investment_accounts.exists():
                logger.info(f"No investment accounts found for institution {institution.name}")
                return True
            
            logger.info(f"Syncing holdings for institution {institution.name}")
            
            # Get holdings from Plaid
            holdings_data = self.plaid_service.get_investments_holdings(institution.access_token)
            
            # First, sync securities
            securities_by_id = {}
            for security_data in holdings_data['securities']:
                security, created = Security.objects.update_or_create(
                    plaid_security_id=security_data['security_id'],
                    defaults={
                        'name': security_data.get('name', ''),
                        'ticker_symbol': security_data.get('ticker_symbol'),
                        'cusip': security_data.get('cusip'),
                        'isin': security_data.get('isin'),
                        'sedol': security_data.get('sedol'),
                        'type': security_data.get('type'),
                        'close_price': security_data.get('close_price'),
                        'close_price_as_of': security_data.get('close_price_as_of'),
                        'institution_id': security_data.get('institution_id'),
                        'institution_security_id': security_data.get('institution_security_id'),
                        'is_cash_equivalent': security_data.get('is_cash_equivalent', False),
                    }
                )
                securities_by_id[security_data['security_id']] = security
                if created:
                    logger.info(f"Created security: {security.ticker_symbol or security.name}")
            
            # Sync holdings
            holdings_synced = 0
            for holding_data in holdings_data['holdings']:
                try:
                    account = Account.objects.get(
                        plaid_account_id=holding_data['account_id']
                    )
                    security = securities_by_id.get(holding_data['security_id'])
                    
                    if not security:
                        logger.warning(f"Security not found for holding: {holding_data['security_id']}")
                        continue
                    
                    holding, created = Holding.objects.update_or_create(
                        account=account,
                        security=security,
                        defaults={
                            'quantity': holding_data['quantity'],
                            'institution_price': holding_data['institution_price'],
                            'institution_price_as_of': holding_data.get('institution_price_as_of'),
                            'institution_value': holding_data['institution_value'],
                            'cost_basis': holding_data.get('cost_basis'),
                            'iso_currency_code': holding_data.get('iso_currency_code', 'USD'),
                        }
                    )
                    
                    if created:
                        holdings_synced += 1
                        logger.info(f"Created holding: {security.ticker_symbol or security.name} - {holding.quantity} shares")
                    
                except Account.DoesNotExist:
                    logger.warning(f"Account not found for holding: {holding_data['account_id']}")
                except Exception as e:
                    logger.error(f"Error processing holding: {e}")
            
            logger.info(f"Holdings sync completed for {institution.name}. Total synced: {holdings_synced}")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing holdings for institution {institution.id}: {e}")
            logger.exception("Full exception details:")
            return False
    
    def sync_institution_investment_transactions(self, institution, start_date=None, end_date=None):
        """Sync investment transactions for an institution"""
        from .models import Account, Security, InvestmentTransaction
        
        if not start_date:
            start_date = (timezone.now() - timedelta(days=365)).date()
        if not end_date:
            end_date = timezone.now().date()
        
        try:
            # Only sync for investment accounts
            investment_accounts = Account.objects.filter(
                institution=institution,
                type='investment'
            )
            
            if not investment_accounts.exists():
                logger.info(f"No investment accounts found for institution {institution.name}")
                return True
            
            logger.info(f"Syncing investment transactions for institution {institution.name}")
            
            # Get investment transactions from Plaid
            transactions_data = self.plaid_service.get_investments_transactions(
                institution.access_token, start_date, end_date
            )
            
            # Ensure securities exist
            securities_by_id = {}
            for security_data in transactions_data['securities']:
                security, created = Security.objects.update_or_create(
                    plaid_security_id=security_data['security_id'],
                    defaults={
                        'name': security_data.get('name', ''),
                        'ticker_symbol': security_data.get('ticker_symbol'),
                        'cusip': security_data.get('cusip'),
                        'isin': security_data.get('isin'),
                        'sedol': security_data.get('sedol'),
                        'type': security_data.get('type'),
                        'close_price': security_data.get('close_price'),
                        'close_price_as_of': security_data.get('close_price_as_of'),
                        'institution_id': security_data.get('institution_id'),
                        'institution_security_id': security_data.get('institution_security_id'),
                        'is_cash_equivalent': security_data.get('is_cash_equivalent', False),
                    }
                )
                securities_by_id[security_data['security_id']] = security
            
            # Sync investment transactions
            transactions_synced = 0
            for trans_data in transactions_data['investment_transactions']:
                try:
                    account = Account.objects.get(
                        plaid_account_id=trans_data['account_id']
                    )
                    
                    # Security is optional for some transaction types
                    security = None
                    if trans_data.get('security_id'):
                        security = securities_by_id.get(trans_data['security_id'])
                    
                    transaction, created = InvestmentTransaction.objects.update_or_create(
                        plaid_investment_transaction_id=trans_data['investment_transaction_id'],
                        defaults={
                            'account': account,
                            'security': security,
                            'amount': trans_data['amount'],
                            'quantity': trans_data.get('quantity'),
                            'price': trans_data.get('price'),
                            'fees': trans_data.get('fees'),
                            'type': trans_data['type'],
                            'subtype': trans_data['subtype'],
                            'date': trans_data['date'],
                            'name': trans_data['name'],
                            'iso_currency_code': trans_data.get('iso_currency_code', 'USD'),
                        }
                    )
                    
                    if created:
                        transactions_synced += 1
                        logger.info(f"Created investment transaction: {transaction.name} - ${transaction.amount}")
                    
                except Account.DoesNotExist:
                    logger.warning(f"Account not found for investment transaction: {trans_data['account_id']}")
                except Exception as e:
                    logger.error(f"Error processing investment transaction: {e}")
            
            logger.info(f"Investment transactions sync completed for {institution.name}. Total synced: {transactions_synced}")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing investment transactions for institution {institution.id}: {e}")
            logger.exception("Full exception details:")
            return False


class AnalyticsService:
    """Service for financial analytics and insights"""
    
    def calculate_net_worth(self, user):
        """Calculate user's current net worth"""
        from .models import Account
        
        accounts = Account.objects.filter(
            institution__user=user,
            is_active=True,
            is_selected=True
        )
        
        total_assets = sum(
            acc.current_balance for acc in accounts 
            if acc.is_asset
        )
        
        total_liabilities = sum(
            acc.current_balance for acc in accounts 
            if acc.is_liability
        )
        
        return {
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'net_worth': total_assets - total_liabilities,
            'as_of': timezone.now(),
        }
    
    def get_spending_by_category(self, user, start_date, end_date):
        """Get spending breakdown by category for a date range"""
        from .models import Transaction
        from django.db.models import Sum, Count
        
        transactions = Transaction.objects.filter(
            account__institution__user=user,
            date__gte=start_date,
            date__lte=end_date,
            amount__gt=0,  # Only expenses
        ).exclude(
            account__type='transfer'  # Exclude transfers
        )
        
        category_spending = transactions.values('primary_category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        return category_spending
    
    def get_monthly_cash_flow(self, user, year, month):
        """Calculate monthly cash flow (income vs expenses)"""
        from .models import Transaction
        from django.db.models import Sum
        
        # Get all transactions for the month
        transactions = Transaction.objects.filter(
            account__institution__user=user,
            date__year=year,
            date__month=month,
        )
        
        # Income (negative amounts in Plaid are deposits/income)
        income = transactions.filter(
            amount__lt=0
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Expenses (positive amounts)
        expenses = transactions.filter(
            amount__gt=0
        ).exclude(
            account__type='transfer'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        return {
            'income': abs(income),  # Make positive for display
            'expenses': expenses,
            'net_cash_flow': abs(income) - expenses,
            'savings_rate': (abs(income) - expenses) / abs(income) * 100 if income else 0,
        }


class RecurringTransactionDetectionService:
    """Service for auto-detecting recurring transactions from transaction history"""
    
    def detect_recurring_transactions(self, user, min_occurrences=3, lookback_days=365):
        """
        Analyze transaction history and detect recurring patterns.
        
        Criteria for detecting recurring transactions:
        - Same merchant/vendor name (normalized)
        - Similar amount (within 5% tolerance)
        - Appears 3+ times in the lookback period
        - Transactions are approximately evenly spaced
        """
        from .models import Transaction, RecurringTransaction, SpendingCategory
        from django.db.models import Count, Avg, StdDev
        from collections import defaultdict
        from datetime import timedelta
        import re
        
        logger.info(f"Starting recurring transaction detection for user {user.id}")
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=lookback_days)
        
        # Get all expense transactions in the lookback period
        transactions = Transaction.objects.filter(
            account__institution__user=user,
            date__gte=start_date,
            date__lte=end_date,
            amount__gt=0,  # Only expenses
        ).order_by('date')
        
        # Group transactions by normalized merchant/amount
        pattern_groups = defaultdict(list)
        
        for tx in transactions:
            # Normalize merchant name
            merchant = self._normalize_merchant_name(tx.merchant_name or tx.name)
            if not merchant or merchant == 'unknown':
                continue
            
            # Round amount to nearest dollar for grouping
            rounded_amount = round(float(tx.amount))
            if rounded_amount <= 0:
                continue
            
            key = f"{merchant}|{rounded_amount}"
            pattern_groups[key].append(tx)
        
        # Analyze each group for recurring patterns
        detected_recurring = []
        
        for key, txs in pattern_groups.items():
            if len(txs) < min_occurrences:
                continue
            
            merchant, amount_str = key.split('|')
            amount = float(amount_str)
            
            # Check if transactions are evenly spaced (monthly pattern)
            frequency = self._detect_frequency(txs)
            if not frequency:
                continue
            
            # Calculate average amount across occurrences
            avg_amount = sum(float(tx.amount) for tx in txs) / len(txs)
            
            detected_recurring.append({
                'merchant': self._format_merchant_name(merchant),
                'amount': round(avg_amount, 2),
                'frequency': frequency,
                'occurrences': len(txs),
                'first_date': txs[0].date,
                'last_date': txs[-1].date,
                'transactions': txs,
                'primary_category': txs[0].primary_category,
            })
        
        logger.info(f"Detected {len(detected_recurring)} recurring transaction patterns")
        return detected_recurring
    
    def create_recurring_transactions(self, user, auto_create=False):
        """
        Detect and optionally create RecurringTransaction records for the user.
        Returns list of detected patterns.
        """
        from .models import RecurringTransaction, SpendingCategory
        from dateutil.relativedelta import relativedelta
        
        patterns = self.detect_recurring_transactions(user)
        created_count = 0
        
        for pattern in patterns:
            # Check if similar recurring transaction already exists
            existing = RecurringTransaction.objects.filter(
                user=user,
                merchant_name__iexact=pattern['merchant'],
                amount__gte=pattern['amount'] * 0.95,
                amount__lte=pattern['amount'] * 1.05,
            ).first()
            
            if existing:
                # Update existing with is_auto_detected flag
                if not existing.is_auto_detected:
                    existing.is_auto_detected = True
                    existing.save()
                pattern['existing_id'] = str(existing.id)
                continue
            
            if auto_create:
                # Calculate next expected date
                last_date = pattern['last_date']
                frequency = pattern['frequency']
                
                if frequency == 'monthly':
                    next_date = last_date + relativedelta(months=1)
                elif frequency == 'weekly':
                    next_date = last_date + timedelta(days=7)
                elif frequency == 'bi_weekly':
                    next_date = last_date + timedelta(days=14)
                elif frequency == 'quarterly':
                    next_date = last_date + relativedelta(months=3)
                elif frequency == 'yearly':
                    next_date = last_date + relativedelta(years=1)
                else:
                    next_date = last_date + relativedelta(months=1)
                
                # Adjust next_date if it's in the past
                while next_date < timezone.now().date():
                    if frequency == 'monthly':
                        next_date = next_date + relativedelta(months=1)
                    elif frequency == 'weekly':
                        next_date = next_date + timedelta(days=7)
                    elif frequency == 'bi_weekly':
                        next_date = next_date + timedelta(days=14)
                    elif frequency == 'quarterly':
                        next_date = next_date + relativedelta(months=3)
                    elif frequency == 'yearly':
                        next_date = next_date + relativedelta(years=1)
                    else:
                        next_date = next_date + relativedelta(months=1)
                
                # Try to match category
                category = None
                if pattern['primary_category']:
                    category = SpendingCategory.objects.filter(
                        user=user,
                        name__icontains=pattern['primary_category'].replace('_', ' ')
                    ).first()
                
                # Create the recurring transaction
                recurring = RecurringTransaction.objects.create(
                    user=user,
                    name=pattern['merchant'],
                    amount=pattern['amount'],
                    frequency=frequency,
                    start_date=pattern['first_date'],
                    next_date=next_date,
                    category=category,
                    merchant_name=pattern['merchant'],
                    is_active=True,
                    is_auto_detected=True,
                    notes=f"Auto-detected from {pattern['occurrences']} transactions",
                )
                pattern['created_id'] = str(recurring.id)
                created_count += 1
        
        logger.info(f"Created {created_count} new recurring transaction records")
        return patterns
    
    def _normalize_merchant_name(self, name):
        """Normalize merchant name for grouping"""
        if not name:
            return 'unknown'
        
        # Convert to lowercase
        name = name.lower().strip()
        
        # Remove common suffixes and numbers
        name = re.sub(r'\s*(#\d+|\d{4,}|store\s*\d+|loc\s*\d+).*$', '', name)
        
        # Remove special characters but keep spaces and basic punctuation
        name = re.sub(r'[^\w\s\'-]', '', name)
        
        # Normalize whitespace
        name = re.sub(r'\s+', ' ', name).strip()
        
        # Truncate to first 40 chars for grouping
        if len(name) > 40:
            name = name[:40]
        
        return name
    
    def _format_merchant_name(self, name):
        """Format merchant name for display"""
        if not name:
            return 'Unknown'
        
        # Title case but preserve common abbreviations
        words = name.split()
        formatted = []
        for word in words:
            if word.upper() in ['ATM', 'LLC', 'INC', 'CO', 'LTD']:
                formatted.append(word.upper())
            else:
                formatted.append(word.capitalize())
        
        return ' '.join(formatted)
    
    def _detect_frequency(self, transactions):
        """
        Analyze transaction dates to determine frequency.
        Returns frequency string or None if pattern is irregular.
        """
        from statistics import mean, stdev
        
        if len(transactions) < 3:
            return None
        
        # Calculate intervals between consecutive transactions
        intervals = []
        sorted_txs = sorted(transactions, key=lambda x: x.date)
        
        for i in range(1, len(sorted_txs)):
            delta = (sorted_txs[i].date - sorted_txs[i-1].date).days
            intervals.append(delta)
        
        if not intervals:
            return None
        
        avg_interval = mean(intervals)
        
        # Determine frequency based on average interval
        # Allow some variance for human billing cycles
        if 6 <= avg_interval <= 8:
            return 'weekly'
        elif 13 <= avg_interval <= 16:
            return 'bi_weekly'
        elif 27 <= avg_interval <= 33:
            return 'monthly'
        elif 85 <= avg_interval <= 100:
            return 'quarterly'
        elif 180 <= avg_interval <= 200:
            return 'semi_annually'
        elif 350 <= avg_interval <= 380:
            return 'yearly'
        
        # If interval is less than 40 days and appears regularly, consider monthly
        if avg_interval < 40 and len(intervals) >= 2:
            # Check if variance is acceptable (within 25%)
            try:
                interval_stdev = stdev(intervals)
                if interval_stdev / avg_interval < 0.25:
                    return 'monthly'
            except:
                pass
        
        return None

