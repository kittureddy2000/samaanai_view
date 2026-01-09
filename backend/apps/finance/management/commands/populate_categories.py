from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.finance.models import SpendingCategory


class Command(BaseCommand):
    help = 'Populate default spending categories from screenshots'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to create categories for (if not specified, creates for all users)',
        )

    def handle(self, *args, **options):
        # Define categories based on screenshots
        categories = [
            # Auto & Transport
            {'name': 'Auto Insurance', 'icon': '🚗', 'color': '#ef4444'},
            {'name': 'Auto Payment', 'icon': '🚗', 'color': '#ef4444'},
            {'name': 'Car Wash', 'icon': '🧼', 'color': '#ef4444'},
            {'name': 'Gas & Fuel', 'icon': '⛽', 'color': '#ef4444'},
            {'name': 'Parking', 'icon': '🅿️', 'color': '#ef4444'},
            {'name': 'Public Transportation', 'icon': '🚌', 'color': '#ef4444'},
            {'name': 'Registration', 'icon': '📝', 'color': '#ef4444'},
            {'name': 'Vehicle Property Tax', 'icon': '💰', 'color': '#ef4444'},

            # Bills & Utilities
            {'name': 'Internet', 'icon': '🌐', 'color': '#f59e0b'},
            {'name': 'Mobile Phone', 'icon': '📱', 'color': '#f59e0b'},
            {'name': 'Television', 'icon': '📺', 'color': '#f59e0b'},
            {'name': 'Utilities', 'icon': '⚡', 'color': '#f59e0b'},
            {'name': 'Gas & Electric', 'icon': '💡', 'color': '#f59e0b'},
            {'name': 'Water', 'icon': '💧', 'color': '#f59e0b'},
            {'name': 'Trash', 'icon': '🗑️', 'color': '#f59e0b'},

            # Education
            {'name': 'Books & Supplies', 'icon': '📚', 'color': '#3b82f6'},
            {'name': 'Student Loan', 'icon': '🎓', 'color': '#3b82f6'},
            {'name': 'Tuition', 'icon': '🏫', 'color': '#3b82f6'},

            # Entertainment
            {'name': 'Entertainment', 'icon': '🎬', 'color': '#8b5cf6'},
            {'name': 'Movies', 'icon': '🎥', 'color': '#8b5cf6'},
            {'name': 'Music', 'icon': '🎵', 'color': '#8b5cf6'},

            # Dining & Drinks
            {'name': 'Bars', 'icon': '🍺', 'color': '#ec4899'},
            {'name': 'Coffee Shops', 'icon': '☕', 'color': '#ec4899'},
            {'name': 'Fast Food', 'icon': '🍔', 'color': '#ec4899'},
            {'name': 'Restaurants', 'icon': '🍽️', 'color': '#ec4899'},

            # Fees & Charges
            {'name': 'ATM Fee', 'icon': '🏧', 'color': '#64748b'},
            {'name': 'Finance Charge', 'icon': '💳', 'color': '#64748b'},
            {'name': 'Late Fee', 'icon': '⏰', 'color': '#64748b'},
            {'name': 'Service Fee', 'icon': '🔧', 'color': '#64748b'},

            # Financial
            {'name': 'Financial Advisor', 'icon': '💼', 'color': '#10b981'},
            {'name': 'Life Insurance', 'icon': '🛡️', 'color': '#10b981'},

            # Fitness
            {'name': 'Gym', 'icon': '🏋️', 'color': '#06b6d4'},
            {'name': 'Workout Classes', 'icon': '🤸', 'color': '#06b6d4'},

            # Gifts
            {'name': 'Gifts', 'icon': '🎁', 'color': '#f43f5e'},

            # Groceries
            {'name': 'Groceries', 'icon': '🛒', 'color': '#22c55e'},

            # Health
            {'name': 'Dentist', 'icon': '🦷', 'color': '#14b8a6'},
            {'name': 'Doctor', 'icon': '👨‍⚕️', 'color': '#14b8a6'},
            {'name': 'Eyecare', 'icon': '👓', 'color': '#14b8a6'},
            {'name': 'Health Insurance', 'icon': '🏥', 'color': '#14b8a6'},
            {'name': 'Pharmacy', 'icon': '💊', 'color': '#14b8a6'},

            # Home
            {'name': 'Furnishings', 'icon': '🛋️', 'color': '#a855f7'},
            {'name': 'HOA Dues', 'icon': '🏘️', 'color': '#a855f7'},
            {'name': 'Home Improvement', 'icon': '🔨', 'color': '#a855f7'},
            {'name': 'Home Insurance', 'icon': '🏠', 'color': '#a855f7'},
            {'name': 'Home Services', 'icon': '🧰', 'color': '#a855f7'},
            {'name': 'Home Supplies', 'icon': '🧹', 'color': '#a855f7'},

            # Mortgage
            {'name': 'Mortgage Interest', 'icon': '🏡', 'color': '#dc2626'},
            {'name': 'Mortgage Principal', 'icon': '🏡', 'color': '#dc2626'},
            {'name': 'Rent', 'icon': '🏢', 'color': '#dc2626'},

            # Kids
            {'name': 'Allowance', 'icon': '💵', 'color': '#fbbf24'},
            {'name': 'Baby Supplies', 'icon': '👶', 'color': '#fbbf24'},
            {'name': 'Babysitter & Daycare', 'icon': '👶', 'color': '#fbbf24'},
            {'name': 'Child Support', 'icon': '👨‍👩‍👧', 'color': '#fbbf24'},
            {'name': 'Kids Activities', 'icon': '⚽', 'color': '#fbbf24'},
            {'name': 'Toys', 'icon': '🧸', 'color': '#fbbf24'},

            # Loans
            {'name': 'Loan Fees and Charges', 'icon': '📄', 'color': '#78716c'},
            {'name': 'Loan Insurance', 'icon': '📋', 'color': '#78716c'},
            {'name': 'Loan Payment', 'icon': '💰', 'color': '#78716c'},

            # Personal Care
            {'name': 'Hair', 'icon': '💇', 'color': '#fb923c'},
            {'name': 'Laundry', 'icon': '👕', 'color': '#fb923c'},
            {'name': 'Nail Salon', 'icon': '💅', 'color': '#fb923c'},
            {'name': 'Spa', 'icon': '💆', 'color': '#fb923c'},

            # Pets
            {'name': 'Pet Food & Supplies', 'icon': '🐕', 'color': '#84cc16'},
            {'name': 'Pet Grooming', 'icon': '✂️', 'color': '#84cc16'},
            {'name': 'Veterinary', 'icon': '🏥', 'color': '#84cc16'},

            # Shopping
            {'name': 'Books', 'icon': '📖', 'color': '#0ea5e9'},
            {'name': 'Clothing', 'icon': '👔', 'color': '#0ea5e9'},
            {'name': 'Electronics', 'icon': '💻', 'color': '#0ea5e9'},

            # Taxes
            {'name': 'Federal Estimated Tax Payment', 'icon': '🏛️', 'color': '#475569'},
            {'name': 'Federal Tax', 'icon': '🏛️', 'color': '#475569'},
            {'name': 'Local Tax', 'icon': '🏛️', 'color': '#475569'},
            {'name': 'Medicare', 'icon': '🏥', 'color': '#475569'},
            {'name': 'Personal Property Tax', 'icon': '📝', 'color': '#475569'},
            {'name': 'Property Tax', 'icon': '🏘️', 'color': '#475569'},
            {'name': 'Sales Tax', 'icon': '🛍️', 'color': '#475569'},
            {'name': 'SDI', 'icon': '💼', 'color': '#475569'},
            {'name': 'Social Security', 'icon': '👴', 'color': '#475569'},
            {'name': 'State Tax', 'icon': '🏛️', 'color': '#475569'},

            # Travel
            {'name': 'Airline', 'icon': '✈️', 'color': '#6366f1'},
            {'name': 'Hotel', 'icon': '🏨', 'color': '#6366f1'},
            {'name': 'Rental Car & Taxi', 'icon': '🚕', 'color': '#6366f1'},

            # Income Categories
            {'name': 'Alimony', 'icon': '💰', 'color': '#10b981'},
            {'name': 'Bonus', 'icon': '💵', 'color': '#10b981'},
            {'name': 'Child Support', 'icon': '👶', 'color': '#10b981'},
            {'name': 'Dividend Income', 'icon': '📈', 'color': '#10b981'},
            {'name': 'Interest Earned', 'icon': '💹', 'color': '#10b981'},
            {'name': 'Other Income', 'icon': '💰', 'color': '#10b981'},
            {'name': 'Other Pension', 'icon': '👴', 'color': '#10b981'},
            {'name': 'Paycheck', 'icon': '💵', 'color': '#10b981'},
            {'name': 'Tax Refund', 'icon': '💸', 'color': '#10b981'},
            {'name': 'Taxable IRA Withdrawal', 'icon': '🏦', 'color': '#10b981'},

            # Miscellaneous
            {'name': 'Research and Development', 'icon': '🔬', 'color': '#64748b'},
            {'name': 'Charity & Donations', 'icon': '❤️', 'color': '#f43f5e'},
            {'name': 'Uncategorized', 'icon': '❓', 'color': '#9ca3af'},
        ]

        user_id = options.get('user_id')
        if user_id:
            users = User.objects.filter(id=user_id)
            if not users.exists():
                self.stdout.write(self.style.ERROR(f'User with ID {user_id} not found'))
                return
        else:
            users = User.objects.all()

        created_count = 0
        skipped_count = 0

        for user in users:
            self.stdout.write(f'\nProcessing categories for user: {user.username}')

            for cat_data in categories:
                category, created = SpendingCategory.objects.get_or_create(
                    user=user,
                    name=cat_data['name'],
                    defaults={
                        'icon': cat_data.get('icon', ''),
                        'color': cat_data.get('color', '#6B7280'),
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {cat_data["name"]}'))
                else:
                    skipped_count += 1
                    self.stdout.write(f'  - Skipped (already exists): {cat_data["name"]}')

        self.stdout.write(self.style.SUCCESS(f'\nSummary:'))
        self.stdout.write(self.style.SUCCESS(f'  Created: {created_count} categories'))
        self.stdout.write(f'  Skipped: {skipped_count} categories (already existed)')
