from django.core.management.base import BaseCommand
from apps.finance.models import Transaction, Account, Institution
from django.contrib.auth.models import User
from django.db.models import Count

class Command(BaseCommand):
    help = 'Check transaction counts in the database'

    def handle(self, *args, **options):
        total_transactions = Transaction.objects.count()
        self.stdout.write(f"Total transactions in database: {total_transactions}")
        
        # Show transaction counts by institution
        institutions = Institution.objects.annotate(
            transaction_count=Count('accounts__transactions')
        ).filter(transaction_count__gt=0)
        
        for institution in institutions:
            self.stdout.write(f"\n{institution.name} ({institution.user.username}):")
            
            # Show by account
            accounts = Account.objects.filter(institution=institution).annotate(
                transaction_count=Count('transactions')
            ).filter(transaction_count__gt=0)
            
            for account in accounts:
                self.stdout.write(f"  - {account.name}: {account.transaction_count} transactions")
        
        # Show total by user
        users = User.objects.annotate(
            transaction_count=Count('institutions__accounts__transactions')
        ).filter(transaction_count__gt=0)
        
        self.stdout.write(f"\nTransactions by user:")
        for user in users:
            self.stdout.write(f"  - {user.username}: {user.transaction_count} transactions") 