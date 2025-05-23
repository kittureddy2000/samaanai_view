from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.users.models import UserProfile

class Command(BaseCommand):
    help = 'Creates UserProfile objects for all users that do not have one'

    def handle(self, *args, **kwargs):
        users_without_profile = []
        profiles_created = 0
        
        # Get all users
        users = User.objects.all()
        self.stdout.write(f"Found {users.count()} users.")
        
        # Check each user for a profile
        for user in users:
            try:
                # Try to access the profile
                profile = user.profile
                self.stdout.write(f"User {user.username} already has profile.")
            except UserProfile.DoesNotExist:
                # Add to list if no profile exists
                users_without_profile.append(user)
                
        self.stdout.write(f"Found {len(users_without_profile)} users without profiles.")
        
        # Create profiles for users that need them
        for user in users_without_profile:
            UserProfile.objects.create(user=user)
            profiles_created += 1
            self.stdout.write(f"Created profile for {user.username}")
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created {profiles_created} user profiles.')) 