# Backend (Django + Firestore)

This backend uses Django REST Framework and connects to Google Firestore via the Firebase Admin SDK. Authentication is handled by verifying Firebase ID tokens on incoming requests.

## Requirements

- Python 3.11+
- A Firebase project with Firestore enabled
- A Firebase service account key (JSON)

## Setup

1. Create venv and install deps

```powershell
cd "c:\Users\KIAN CARL\Videos\quickserve_services\backend"
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
```

2. Provide Firebase credentials

Choose ONE of the following methods:

- Method A (preferred): set path to service account JSON
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\\path\\to\\serviceAccount.json'
```

- Method B (less secure): provide raw JSON in env var
```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content C:\\path\\to\\serviceAccount.json -Raw
```

Security note: Do NOT commit the service account JSON to source control. Move it outside the repository (e.g., `C:\\secrets\\quickserve-sa.json`) and reference it with `GOOGLE_APPLICATION_CREDENTIALS`.

3. Run the server

```powershell
python manage.py runserver 127.0.0.1:8000
```

## API endpoints (examples)

- Health: `GET /api/status/`
- Services (Firestore):
  - `GET /api/services/` — list services
  - `POST /api/services/` — create a service (demo; protect in production)

## Firebase Auth usage

Frontend should authenticate the user using the Firebase Web SDK and send the ID token with requests:

```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

The backend verifies the ID token via `core.authentication.FirebaseAuthentication` and maps it to a lightweight Django user.

## Notes

- Firestore data is not visible in Django admin. Use custom views or a separate admin UI.
- For production, restrict write endpoints (use `IsAuthenticated`) and add validation.
- Rotate service account keys if they were ever committed or shared publicly.
