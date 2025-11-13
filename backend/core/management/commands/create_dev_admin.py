from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os
import secrets


class Command(BaseCommand):
    help = "Create a development superuser. Reads ADMIN_EMAIL and ADMIN_PASSWORD from env or generates one."

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        if not email:
            email = "admin@example.local"

        if not password:
            # generate a secure random password for local dev
            password = secrets.token_urlsafe(12)

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"Superuser with email {email} already exists."))
            return

        User.objects.create_superuser(username=email.split("@")[0], email=email, password=password)
        self.stdout.write(self.style.SUCCESS("Created development superuser with the following credentials:"))
        self.stdout.write(f"EMAIL: {email}")
        self.stdout.write(f"PASSWORD: {password}")
        self.stdout.write(self.style.WARNING("This user is intended for local development only. Do not use these credentials in production."))
