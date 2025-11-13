from .firebase import init_firebase_app


def get_firestore_client():
    # Lazy import firebase_admin.firestore so the module can be imported even
    # if firebase-admin is not installed in the environment.
    init_firebase_app()
    try:
        from firebase_admin import firestore
    except Exception as exc:
        raise RuntimeError("firebase_admin is not installed or could not be imported") from exc

    return firestore.client()


def get_firebase_auth_client():
    """Get firebase_admin.auth module after app init."""
    init_firebase_app()
    try:
        from firebase_admin import auth as fb_auth
    except Exception as exc:
        raise RuntimeError("firebase_admin is not installed or could not be imported") from exc
    return fb_auth


# Example helpers for a `services` collection
def list_services(limit: int = 50):
    db = get_firestore_client()
    docs = db.collection("services").limit(limit).stream()
    results = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        results.append(item)
    return results


def get_service(service_id: str):
    db = get_firestore_client()
    doc = db.collection("services").document(service_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def create_service(data: dict):
    db = get_firestore_client()
    doc_ref = db.collection("services").add(data)
    return {"id": doc_ref[1].id, **data}


def update_service(service_id: str, data: dict):
    db = get_firestore_client()
    db.collection("services").document(service_id).update(data)
    return get_service(service_id)


def delete_service(service_id: str):
    db = get_firestore_client()
    db.collection("services").document(service_id).delete()
    return True


# Bookings helpers
def list_bookings_for_user(user_uid: str, limit: int = 100):
    db = get_firestore_client()
    q = db.collection("bookings").where("user_id", "==", user_uid).limit(limit)
    docs = q.stream()
    results = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        results.append(item)
    return results


def create_booking(data: dict):
    db = get_firestore_client()
    doc_ref = db.collection("bookings").add(data)
    return {"id": doc_ref[1].id, **data}


# Additional helpers to support profiles, roles, admin operations

def get_booking(booking_id: str):
    db = get_firestore_client()
    doc = db.collection("bookings").document(booking_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def update_booking(booking_id: str, data: dict):
    db = get_firestore_client()
    db.collection("bookings").document(booking_id).update(data)
    return get_booking(booking_id)


def list_all_bookings(limit: int = 500):
    db = get_firestore_client()
    docs = db.collection("bookings").order_by("created_at", direction="DESCENDING").limit(limit).stream()
    results = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        results.append(item)
    return results


# Profiles helpers (stored in collection `user_profiles` with doc id = uid)
def get_profile(uid: str):
    db = get_firestore_client()
    doc = db.collection("user_profiles").document(uid).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    # Expose Firestore create/update times if present
    try:
        # google.cloud.firestore_v1.base_document.DocumentSnapshot
        if hasattr(doc, "create_time") and doc.create_time:
            data.setdefault("created_at", doc.create_time.isoformat())
        if hasattr(doc, "update_time") and doc.update_time:
            data.setdefault("updated_at", doc.update_time.isoformat())
    except Exception:
        pass
    return data


def upsert_profile(uid: str, data: dict):
    db = get_firestore_client()
    # ensure created_at if not present
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    data = {**data}
    data.setdefault("updated_at", now_iso)
    db.collection("user_profiles").document(uid).set(data, merge=True)
    return get_profile(uid)


def list_profiles(limit: int = 1000):
    db = get_firestore_client()
    docs = db.collection("user_profiles").limit(limit).stream()
    results = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        try:
            if hasattr(d, "create_time") and d.create_time:
                item.setdefault("created_at", d.create_time.isoformat())
        except Exception:
            pass
        results.append(item)
    # sort by created_at desc if available
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def list_profiles_map(limit: int = 10000):
    """Return a dict of uid -> profile fields from user_profiles."""
    db = get_firestore_client()
    docs = db.collection("user_profiles").limit(limit).stream()
    results = {}
    for d in docs:
        item = d.to_dict() or {}
        item["id"] = d.id
        try:
            if hasattr(d, "create_time") and d.create_time:
                item.setdefault("created_at", d.create_time.isoformat())
        except Exception:
            pass
        results[d.id] = item
    return results


# Roles helpers (collection `user_roles`, doc id = uid, field `role`)
def get_user_role(uid: str):
    db = get_firestore_client()
    doc = db.collection("user_roles").document(uid).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def set_user_role(uid: str, role: str):
    db = get_firestore_client()
    db.collection("user_roles").document(uid).set({"role": role}, merge=True)
    return get_user_role(uid)


def list_roles_map(limit: int = 10000):
    """Return a dict of uid -> role string from user_roles."""
    db = get_firestore_client()
    docs = db.collection("user_roles").limit(limit).stream()
    roles = {}
    for d in docs:
        data = d.to_dict() or {}
        role = data.get("role")
        if role:
            roles[d.id] = role
    return roles


def list_auth_users(limit: int = 1000):
    """List Firebase Auth users. Returns minimal user entries with id, email, name, created_at.
    Note: Iterates using paging; limit is a soft cap to prevent extremely large lists.
    """
    fb_auth = get_firebase_auth_client()
    from datetime import datetime, timezone

    results = []
    count = 0
    page = fb_auth.list_users()
    while page and count < limit:
        for user in page.users:
            if count >= limit:
                break
            creation_ms = None
            try:
                # user.user_metadata.creation_timestamp is in milliseconds
                creation_ms = getattr(user.user_metadata, "creation_timestamp", None)
            except Exception:
                creation_ms = None
            created_at = None
            if creation_ms:
                try:
                    created_at = datetime.fromtimestamp(creation_ms / 1000.0, tz=timezone.utc).isoformat()
                except Exception:
                    created_at = None
            results.append({
                "id": user.uid,
                "email": user.email or "",
                "name": user.display_name or "",
                "created_at": created_at,
            })
            count += 1
        page = page.get_next_page() if hasattr(page, "get_next_page") else None
    return results


# Categories helpers (collection `categories` with doc fields: name)
def list_categories(limit: int = 200):
    db = get_firestore_client()
    docs = db.collection("categories").order_by("name").limit(limit).stream()
    results = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        results.append(item)
    return results


def create_category(name: str):
    db = get_firestore_client()
    data = {"name": name}
    doc_ref = db.collection("categories").add(data)
    return {"id": doc_ref[1].id, **data}


def delete_category(category_id: str):
    db = get_firestore_client()
    db.collection("categories").document(category_id).delete()
    return True
