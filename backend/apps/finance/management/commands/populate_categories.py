from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.finance.models import SpendingCategory


class Command(BaseCommand):
    help = 'Populate hierarchical spending categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to create categories for (if not specified, creates for all users)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing categories before populating',
        )

    def handle(self, *args, **options):
        # Define hierarchical categories structure
        # Format: {parent_name: {icon, color, children: [{name, icon}]}}
        hierarchical_categories = {
            'Auto & Transport': {
                'icon': '🚗',
                'color': '#ef4444',
                'children': [
                    {'name': 'Auto Insurance', 'icon': '📋'},
                    {'name': 'Auto Payment', 'icon': '💳'},
                    {'name': 'Car Wash', 'icon': '🧼'},
                    {'name': 'Gas & Fuel', 'icon': '⛽'},
                    {'name': 'Parking', 'icon': '🅿️'},
                    {'name': 'Public Transportation', 'icon': '🚌'},
                    {'name': 'Registration', 'icon': '📝'},
                    {'name': 'Vehicle Property Tax', 'icon': '💰'},
                    {'name': 'Ride Share', 'icon': '🚕'},
                    {'name': 'Service & Parts', 'icon': '🔧'},
                ]
            },
            'Bills & Utilities': {
                'icon': '📱',
                'color': '#f59e0b',
                'children': [
                    {'name': 'Internet', 'icon': '🌐'},
                    {'name': 'Mobile Phone', 'icon': '📱'},
                    {'name': 'Television', 'icon': '📺'},
                    {'name': 'Utilities', 'icon': '⚡'},
                    {'name': 'Gas & Electric', 'icon': '💡'},
                    {'name': 'Water', 'icon': '💧'},
                    {'name': 'Trash', 'icon': '🗑️'},
                ]
            },
            'Education': {
                'icon': '🎓',
                'color': '#3b82f6',
                'children': [
                    {'name': 'Books & Supplies', 'icon': '📚'},
                    {'name': 'Student Loan', 'icon': '🎓'},
                    {'name': 'Tuition', 'icon': '🏫'},
                ]
            },
            'Entertainment': {
                'icon': '🎬',
                'color': '#8b5cf6',
                'children': [
                    {'name': 'Movies', 'icon': '🎥'},
                    {'name': 'Music', 'icon': '🎵'},
                    {'name': 'Games', 'icon': '🎮'},
                    {'name': 'Concerts', 'icon': '🎤'},
                    {'name': 'Streaming Services', 'icon': '📺'},
                ]
            },
            'Dining & Drinks': {
                'icon': '🍽️',
                'color': '#ec4899',
                'children': [
                    {'name': 'Bars', 'icon': '🍺'},
                    {'name': 'Coffee Shops', 'icon': '☕'},
                    {'name': 'Fast Food', 'icon': '🍔'},
                    {'name': 'Restaurants', 'icon': '🍽️'},
                    {'name': 'Food Delivery', 'icon': '🛵'},
                ]
            },
            'Fees & Charges': {
                'icon': '💳',
                'color': '#64748b',
                'children': [
                    {'name': 'ATM Fee', 'icon': '🏧'},
                    {'name': 'Finance Charge', 'icon': '💳'},
                    {'name': 'Late Fee', 'icon': '⏰'},
                    {'name': 'Service Fee', 'icon': '🔧'},
                    {'name': 'Bank Fee', 'icon': '🏦'},
                ]
            },
            'Financial': {
                'icon': '💼',
                'color': '#10b981',
                'children': [
                    {'name': 'Financial Advisor', 'icon': '💼'},
                    {'name': 'Life Insurance', 'icon': '🛡️'},
                    {'name': 'Investments', 'icon': '📈'},
                ]
            },
            'Fitness': {
                'icon': '🏋️',
                'color': '#06b6d4',
                'children': [
                    {'name': 'Gym', 'icon': '🏋️'},
                    {'name': 'Workout Classes', 'icon': '🤸'},
                    {'name': 'Sports', 'icon': '⚽'},
                ]
            },
            'Groceries': {
                'icon': '🛒',
                'color': '#22c55e',
                'children': []  # No children - standalone
            },
            'Health': {
                'icon': '🏥',
                'color': '#14b8a6',
                'children': [
                    {'name': 'Dentist', 'icon': '🦷'},
                    {'name': 'Doctor', 'icon': '👨‍⚕️'},
                    {'name': 'Eyecare', 'icon': '👓'},
                    {'name': 'Health Insurance', 'icon': '🏥'},
                    {'name': 'Pharmacy', 'icon': '💊'},
                ]
            },
            'Home': {
                'icon': '🏠',
                'color': '#a855f7',
                'children': [
                    {'name': 'Furnishings', 'icon': '🛋️'},
                    {'name': 'HOA Dues', 'icon': '🏘️'},
                    {'name': 'Home Improvement', 'icon': '🔨'},
                    {'name': 'Home Insurance', 'icon': '🏠'},
                    {'name': 'Home Services', 'icon': '🧰'},
                    {'name': 'Home Supplies', 'icon': '🧹'},
                ]
            },
            'Housing': {
                'icon': '🏡',
                'color': '#dc2626',
                'children': [
                    {'name': 'Mortgage Interest', 'icon': '🏡'},
                    {'name': 'Mortgage Principal', 'icon': '🏡'},
                    {'name': 'Rent', 'icon': '🏢'},
                ]
            },
            'Kids': {
                'icon': '👶',
                'color': '#fbbf24',
                'children': [
                    {'name': 'Allowance', 'icon': '💵'},
                    {'name': 'Baby Supplies', 'icon': '👶'},
                    {'name': 'Babysitter & Daycare', 'icon': '👶'},
                    {'name': 'Child Support', 'icon': '👨‍👩‍👧'},
                    {'name': 'Kids Activities', 'icon': '⚽'},
                    {'name': 'Toys', 'icon': '🧸'},
                ]
            },
            'Loans': {
                'icon': '💰',
                'color': '#78716c',
                'children': [
                    {'name': 'Loan Fees and Charges', 'icon': '📄'},
                    {'name': 'Loan Insurance', 'icon': '📋'},
                    {'name': 'Loan Payment', 'icon': '💰'},
                ]
            },
            'Personal Care': {
                'icon': '💆',
                'color': '#fb923c',
                'children': [
                    {'name': 'Hair', 'icon': '💇'},
                    {'name': 'Laundry', 'icon': '👕'},
                    {'name': 'Nail Salon', 'icon': '💅'},
                    {'name': 'Spa', 'icon': '💆'},
                ]
            },
            'Pets': {
                'icon': '🐕',
                'color': '#84cc16',
                'children': [
                    {'name': 'Pet Food & Supplies', 'icon': '🐕'},
                    {'name': 'Pet Grooming', 'icon': '✂️'},
                    {'name': 'Veterinary', 'icon': '🏥'},
                ]
            },
            'Shopping': {
                'icon': '🛍️',
                'color': '#0ea5e9',
                'children': [
                    {'name': 'Books', 'icon': '📖'},
                    {'name': 'Clothing', 'icon': '👔'},
                    {'name': 'Electronics', 'icon': '💻'},
                    {'name': 'Hobbies', 'icon': '🎨'},
                    {'name': 'Gifts', 'icon': '🎁'},
                ]
            },
            'Taxes': {
                'icon': '🏛️',
                'color': '#475569',
                'children': [
                    {'name': 'Federal Estimated Tax Payment', 'icon': '🏛️'},
                    {'name': 'Federal Tax', 'icon': '🏛️'},
                    {'name': 'Local Tax', 'icon': '🏛️'},
                    {'name': 'Medicare', 'icon': '🏥'},
                    {'name': 'Personal Property Tax', 'icon': '📝'},
                    {'name': 'Property Tax', 'icon': '🏘️'},
                    {'name': 'Sales Tax', 'icon': '🛍️'},
                    {'name': 'SDI', 'icon': '💼'},
                    {'name': 'Social Security', 'icon': '👴'},
                    {'name': 'State Tax', 'icon': '🏛️'},
                ]
            },
            'Travel': {
                'icon': '✈️',
                'color': '#6366f1',
                'children': [
                    {'name': 'Airline', 'icon': '✈️'},
                    {'name': 'Hotel', 'icon': '🏨'},
                    {'name': 'Rental Car & Taxi', 'icon': '🚕'},
                    {'name': 'Vacation', 'icon': '🏖️'},
                ]
            },
            'Income': {
                'icon': '💵',
                'color': '#10b981',
                'children': [
                    {'name': 'Alimony', 'icon': '💰'},
                    {'name': 'Bonus', 'icon': '💵'},
                    {'name': 'Dividend Income', 'icon': '📈'},
                    {'name': 'Interest Earned', 'icon': '💹'},
                    {'name': 'Other Income', 'icon': '💰'},
                    {'name': 'Other Pension', 'icon': '👴'},
                    {'name': 'Paycheck', 'icon': '💵'},
                    {'name': 'Tax Refund', 'icon': '💸'},
                    {'name': 'Taxable IRA Withdrawal', 'icon': '🏦'},
                ]
            },
            'Charity & Donations': {
                'icon': '❤️',
                'color': '#f43f5e',
                'children': []  # Standalone
            },
            'Uncategorized': {
                'icon': '❓',
                'color': '#9ca3af',
                'children': []  # Standalone
            },
        }

        user_id = options.get('user_id')
        clear = options.get('clear', False)
        
        if user_id:
            users = User.objects.filter(id=user_id)
            if not users.exists():
                self.stdout.write(self.style.ERROR(f'User with ID {user_id} not found'))
                return
        else:
            users = User.objects.all()

        for user in users:
            self.stdout.write(f'\nProcessing categories for user: {user.username}')
            
            if clear:
                deleted_count = SpendingCategory.objects.filter(user=user).delete()[0]
                self.stdout.write(self.style.WARNING(f'  Deleted {deleted_count} existing categories'))

            parent_count = 0
            child_count = 0

            for parent_name, config in hierarchical_categories.items():
                # Create parent category
                parent_category, parent_created = SpendingCategory.objects.get_or_create(
                    user=user,
                    name=parent_name,
                    defaults={
                        'icon': config['icon'],
                        'color': config['color'],
                        'parent': None,  # Top-level
                    }
                )
                
                if parent_created:
                    parent_count += 1
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Created parent: {parent_name}'))
                else:
                    # Update parent to None if it was previously a child
                    if parent_category.parent is not None:
                        parent_category.parent = None
                        parent_category.save()
                    self.stdout.write(f'  - Skipped (exists): {parent_name}')

                # Create child categories
                for child in config['children']:
                    child_category, child_created = SpendingCategory.objects.get_or_create(
                        user=user,
                        name=child['name'],
                        defaults={
                            'icon': child.get('icon', config['icon']),
                            'color': config['color'],  # Inherit parent color
                            'parent': parent_category,
                        }
                    )
                    
                    if child_created:
                        child_count += 1
                        self.stdout.write(self.style.SUCCESS(f'    ✓ Created child: {child["name"]}'))
                    else:
                        # Update parent relationship if needed
                        if child_category.parent != parent_category:
                            child_category.parent = parent_category
                            child_category.save()
                        self.stdout.write(f'    - Skipped (exists): {child["name"]}')

            self.stdout.write(self.style.SUCCESS(f'\nUser {user.username} summary:'))
            self.stdout.write(self.style.SUCCESS(f'  Parents created: {parent_count}'))
            self.stdout.write(self.style.SUCCESS(f'  Children created: {child_count}'))

        self.stdout.write(self.style.SUCCESS('\nDone!'))
