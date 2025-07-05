from django.core.management.base import BaseCommand
from apps.finance.models import Institution
from apps.finance.services import TransactionSyncService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sync transactions for all or specific institutions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--institution-id',
            type=str,
            help='Sync transactions for a specific institution ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Sync transactions for all institutions',
        )

    def handle(self, *args, **options):
        sync_service = TransactionSyncService()
        
        if options['institution_id']:
            try:
                institution = Institution.objects.get(id=options['institution_id'])
                self.stdout.write(f"Syncing transactions for {institution.name}...")
                sync_service.sync_institution_transactions(institution)
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully synced transactions for {institution.name}")
                )
            except Institution.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Institution with ID {options['institution_id']} not found")
                )
        elif options['all']:
            institutions = Institution.objects.filter(is_active=True)
            for institution in institutions:
                self.stdout.write(f"Syncing transactions for {institution.name}...")
                try:
                    sync_service.sync_institution_transactions(institution)
                    self.stdout.write(
                        self.style.SUCCESS(f"Successfully synced transactions for {institution.name}")
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Failed to sync transactions for {institution.name}: {e}")
                    )
        else:
            self.stdout.write(
                self.style.ERROR("Please specify --institution-id <id> or --all")
            ) 