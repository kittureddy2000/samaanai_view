from django.core.management.base import BaseCommand
from apps.finance.models import Institution, Transaction
from apps.finance.services import TransactionSyncService, PlaidService
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fetch more historical transactions for all institutions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=730,  # 2 years
            help='Number of days to look back for transactions (default: 730)',
        )
        parser.add_argument(
            '--institution-id',
            type=str,
            help='Fetch transactions for a specific institution ID only',
        )

    def handle(self, *args, **options):
        days_back = options['days']
        institution_id = options['institution_id']
        
        # Calculate date range
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        self.stdout.write(f"Fetching transactions from {start_date} to {end_date} ({days_back} days)")
        
        # Get institutions to process
        if institution_id:
            try:
                institutions = [Institution.objects.get(id=institution_id)]
            except Institution.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Institution with ID {institution_id} not found")
                )
                return
        else:
            institutions = Institution.objects.filter(is_active=True)
        
        plaid_service = PlaidService()
        total_new_transactions = 0
        
        for institution in institutions:
            self.stdout.write(f"\nProcessing {institution.name}...")
            
            try:
                # Get current transaction count
                current_count = Transaction.objects.filter(
                    account__institution=institution
                ).count()
                
                self.stdout.write(f"Current transactions: {current_count}")
                
                # Fetch transactions using the get_transactions method (not sync)
                transactions_data = plaid_service.get_transactions(
                    institution.access_token,
                    start_date,
                    end_date
                )
                
                self.stdout.write(f"Plaid returned {len(transactions_data)} transactions")
                
                # Process transactions
                new_transactions = 0
                for trans_data in transactions_data:
                    try:
                        from apps.finance.models import Account
                        
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
                                'category': trans_data.get('category', []),
                                'primary_category': trans_data.get('category', [''])[0] if trans_data.get('category') else None,
                                'detailed_category': trans_data.get('detailed_category'),
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
                            new_transactions += 1
                            
                    except Account.DoesNotExist:
                        self.stdout.write(f"  - Account not found: {trans_data['account_id']}")
                    except Exception as e:
                        self.stdout.write(f"  - Error processing transaction: {e}")
                
                total_new_transactions += new_transactions
                
                # Get final count
                final_count = Transaction.objects.filter(
                    account__institution=institution
                ).count()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ {institution.name}: {new_transactions} new transactions "
                        f"(total: {current_count} → {final_count})"
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ Error processing {institution.name}: {e}")
                )
                logger.exception(f"Error fetching transactions for {institution.name}")
        
        self.stdout.write(
            self.style.SUCCESS(f"\nCompleted! Total new transactions: {total_new_transactions}")
        ) 