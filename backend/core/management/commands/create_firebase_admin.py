import secrets
import string
from django.core.management.base import BaseCommand
from core.firebase import init_firebase_app
from core.firestore_client import set_user_role, get_user_role, get_profile, upsert_profile

class Command(BaseCommand):
    help = "Create or promote a Firebase user to admin role and output credentials (email + generated password)."

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email for the admin user (will be created if absent)', required=True)
        parser.add_argument('--password', type=str, help='Optional password (if omitted a secure one is generated)')
        parser.add_argument('--name', type=str, help='Optional display name for profile')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options.get('password')
        name = options.get('name') or 'Administrator'

        if not password:
            alphabet = string.ascii_letters + string.digits + '!@#$%^&*()-_'
            password = ''.join(secrets.choice(alphabet) for _ in range(20))

        # Initialize Firebase Admin
        try:
            init_firebase_app()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'Failed to init firebase-admin: {exc}'))
            return

        try:
            from firebase_admin import auth
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'firebase_admin.auth import failed: {exc}'))
            return

        # Find or create user in Firebase
        try:
            user = auth.get_user_by_email(email)
            updated_existing = True
            # If a password was explicitly provided, update the existing user's password
            if options.get('password'):
                user = auth.update_user(user.uid, password=options['password'])
        except auth.UserNotFoundError:
            user = auth.create_user(email=email, password=password, display_name=name)
            updated_existing = False
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'Error fetching/creating user: {exc}'))
            return

        # Assign admin role in Firestore (user_roles collection)
        set_user_role(user.uid, 'admin')

        # Ensure profile document exists
        existing_profile = get_profile(user.uid)
        profile_data = { 'name': name, 'email': email }
        if not existing_profile:
            upsert_profile(user.uid, profile_data)

        # Output results
        self.stdout.write(self.style.SUCCESS('Admin user ready'))
        self.stdout.write(f'UID: {user.uid}')
        self.stdout.write(f'Email: {email}')
        if not updated_existing:
            self.stdout.write(f'Password: {password}')
        else:
            if options.get('password'):
                self.stdout.write('Password updated to provided value.')
            else:
                self.stdout.write('Existing user retained password (not shown). Use password reset if needed.')
        self.stdout.write('Role: admin')
