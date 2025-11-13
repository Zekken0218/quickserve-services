import os
import json
from pathlib import Path


def init_firebase_app():
    """Initialize firebase-admin app using either GOOGLE_APPLICATION_CREDENTIALS
    pointing to a service account JSON file, or a raw JSON in the
    FIREBASE_SERVICE_ACCOUNT_JSON environment variable.

    This function lazy-imports `firebase_admin` so importing this module
    won't crash in environments where the package isn't installed. Call
    this before any firebase-admin operations.
    """
    try:
        import firebase_admin
        from firebase_admin import credentials, initialize_app
    except Exception as exc:  # ModuleNotFoundError or similar
        raise RuntimeError("firebase_admin is not installed") from exc

    # Avoid re-initializing if already done
    if firebase_admin._apps:
        return firebase_admin.get_app()

    # Option 1: use standard GOOGLE_APPLICATION_CREDENTIALS
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        return initialize_app(cred)

    # Option 2: read raw JSON from env var (convenient for CI or local paste)
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw:
        # If stored as escaped JSON in env, parse it
        data = json.loads(raw)
        cred = credentials.Certificate(data)
        return initialize_app(cred)

    # Fallback: look for a service account JSON inside core/firebase directory
    try:
        current_dir = Path(__file__).resolve().parent
        firebase_dir = current_dir / "firebase"
        if firebase_dir.exists():
            # pick the first *.json file
            for candidate in firebase_dir.glob("*.json"):
                from firebase_admin import credentials, initialize_app
                cred = credentials.Certificate(str(candidate))
                return initialize_app(cred)
    except Exception:
        # ignore and raise below
        pass

    # If neither provided nor discovered, raise explicit error
    raise RuntimeError(
        "Firebase service account not provided. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON."
    )
