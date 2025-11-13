from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model



class FirebaseAuthentication(BaseAuthentication):
    """DRF authentication class that accepts Firebase ID tokens in the
    Authorization header: "Authorization: Bearer <id_token>".

    It verifies the ID token with Firebase Admin SDK and returns a Django user
    object (created on-demand) so your views can use `request.user`.
    """

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None

        id_token = parts[1]
        try:
            # Lazy-import firebase_admin.auth so missing package doesn't fail import time
            from firebase_admin import auth as fb_auth
            decoded = fb_auth.verify_id_token(id_token)
        except Exception as exc:
            raise exceptions.AuthenticationFailed(f"Invalid Firebase ID token: {exc}")

        uid = decoded.get("uid")
        email = decoded.get("email")
        User = get_user_model()

        # Create or get a lightweight Django user backing the Firebase identity
        if email:
            username = email.split("@")[0]
        else:
            username = uid

        user, _ = User.objects.get_or_create(email=email or f"{uid}@firebase.local", defaults={
            "username": username,
            "is_active": True,
        })

        # Attach firebase uid to user instance (non-persistent attribute)
        setattr(user, "firebase_uid", uid)

        return (user, None)
