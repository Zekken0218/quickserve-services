from django.core.management.base import BaseCommand, CommandError

from core.firestore_client import set_user_role


class Command(BaseCommand):
    help = "Promote a Firebase Auth user (by UID) to admin by setting user_roles/<uid> { role: 'admin' } in Firestore."

    def add_arguments(self, parser):
        parser.add_argument("uid", type=str, help="Firebase Auth UID to promote to admin")

    def handle(self, *args, **options):
        uid = options.get("uid")
        if not uid:
            raise CommandError("UID is required")
        try:
            role_doc = set_user_role(uid, "admin")
        except Exception as exc:
            raise CommandError(f"Failed to set role for UID {uid}: {exc}") from exc

        role = (role_doc or {}).get("role")
        if role != "admin":
            raise CommandError(
                f"Unexpected role set for UID {uid}. Expected 'admin', got {role!r}."
            )

        self.stdout.write(self.style.SUCCESS(f"Successfully promoted UID {uid} to admin."))
