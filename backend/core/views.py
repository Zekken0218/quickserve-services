from django.http import JsonResponse
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as drf_status
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid
from .serializers import RegisterSerializer
from .firestore_client import (
	list_services,
	get_service,
	create_service,
	update_service,
	delete_service,
	list_bookings_for_user,
	create_booking,
	get_booking,
	update_booking,
	list_all_bookings,
	get_profile,
	upsert_profile,
	list_profiles,
	list_profiles_map,
	get_user_role,
	set_user_role,
	list_categories,
	create_category,
	list_auth_users,
	list_roles_map,
)
from rest_framework.decorators import authentication_classes
from .authentication import FirebaseAuthentication


def status(request):
	"""Simple JSON endpoint used by the frontend to verify connectivity."""
	return JsonResponse({
		"status": "ok",
		"message": "Hello from Django backend",
	})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
	"""Register a new user. Expects JSON: { email, username, password }"""
	serializer = RegisterSerializer(data=request.data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=drf_status.HTTP_201_CREATED)
	return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
def services_list(request):
	"""GET: list services (public)
	POST: create service document in Firestore (admin only)
	"""
	if request.method == "GET":
		data = list_services()
		return Response(data)

	# POST (require auth and basic validation)
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	# admin check
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)

	payload = request.data or {}
	title = payload.get("title")
	price = payload.get("price")
	if not title or price is None:
		return Response({"detail": "'title' and 'price' are required"}, status=drf_status.HTTP_400_BAD_REQUEST)

	created = create_service({
		"title": title,
		"price": price,
		"category": payload.get("category"),
		"description": payload.get("description"),
		"duration": payload.get("duration"),
		"image_url": payload.get("image_url"),
		"is_active": payload.get("is_active", True),
		"created_by": getattr(request.user, "firebase_uid", getattr(request.user, "id", None)),
	})
	return Response(created, status=drf_status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
def service_detail(request, service_id: str):
	if request.method == "GET":
		service = get_service(service_id)
		if not service:
			return Response({"detail": "Not found"}, status=drf_status.HTTP_404_NOT_FOUND)
		return Response(service)

	# PUT/DELETE require admin
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)

	if request.method == "PUT":
		payload = request.data or {}
		updated = update_service(service_id, {
			k: v for k, v in payload.items()
			if k in {"title", "price", "category", "description", "duration", "image_url", "is_active"}
		})
		if not updated:
			return Response({"detail": "Not found"}, status=drf_status.HTTP_404_NOT_FOUND)
		return Response(updated)

	# DELETE
	ok = delete_service(service_id)
	return Response({"success": bool(ok)})


@api_view(["GET", "POST"])
def bookings(request):
	"""GET: list bookings for authenticated user.
	POST: create a booking referencing a Firestore service document.
	"""
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)

	user_uid = getattr(request.user, "firebase_uid", None)
	if request.method == "GET":
		data = list_bookings_for_user(user_uid)
		return Response(data)

	# POST create booking
	payload = request.data or {}
	service_id = payload.get("service_id")
	booking_date = payload.get("booking_date")  # Expect ISO date string
	booking_time = payload.get("booking_time")
	address = payload.get("address")
	if not service_id or not booking_date or not booking_time or not address:
		return Response({"detail": "service_id, booking_date, booking_time, address required"}, status=drf_status.HTTP_400_BAD_REQUEST)

	service = get_service(service_id)
	if not service:
		return Response({"detail": "Service not found"}, status=drf_status.HTTP_404_NOT_FOUND)

	booking_doc = {
		"user_id": user_uid,
		"service_id": service_id,
		"booking_date": booking_date,
		"booking_time": booking_time,
		"address": address,
		"total_price": service.get("price"),
		"status": "pending",
		"service_title": service.get("title"),
		"created_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
	}
	created = create_booking(booking_doc)
	return Response(created, status=drf_status.HTTP_201_CREATED)


@api_view(["PATCH"])
def booking_detail(request, booking_id: str):
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)

	uid = getattr(request.user, "firebase_uid", None)
	b = get_booking(booking_id)
	if not b:
		return Response({"detail": "Not found"}, status=drf_status.HTTP_404_NOT_FOUND)

	role = get_user_role(uid) if uid else None
	is_admin = role and role.get("role") == "admin"

	payload = request.data or {}
	allowed_user_fields = {"booking_date", "booking_time", "address"}

	# Owner can edit limited fields and cancel their own booking while pending
	if (not is_admin) and b.get("user_id") == uid:
		update = {}
		for k in allowed_user_fields:
			if k in payload:
				update[k] = payload[k]
		# Allow cancelling
		if payload.get("status") == "cancelled" and b.get("status") in {"pending", "confirmed"}:
			update["status"] = "cancelled"
		if not update:
			return Response({"detail": "No updatable fields provided"}, status=drf_status.HTTP_400_BAD_REQUEST)
		updated = update_booking(booking_id, update)
		return Response(updated)

	# Admin can update status and address/time
	if is_admin:
		update = {k: v for k, v in payload.items() if k in {"status", "booking_date", "booking_time", "address", "total_price"}}
		if not update:
			return Response({"detail": "No updatable fields provided"}, status=drf_status.HTTP_400_BAD_REQUEST)
		updated = update_booking(booking_id, update)
		return Response(updated)

	return Response({"detail": "Forbidden"}, status=drf_status.HTTP_403_FORBIDDEN)


@api_view(["GET"])
def admin_bookings(request):
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)
	data = list_all_bookings()
	return Response(data)


@api_view(["GET", "PUT"])
def me(request):
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	if request.method == "GET":
		prof = get_profile(uid) or {}
		# Always include email from Django user (Firebase auth)
		email = getattr(request.user, "email", None)
		if email:
			prof.setdefault("email", email)
		return Response(prof)

	# PUT update
	payload = request.data or {}
	allowed = {"name", "phone", "address", "email"}
	update = {k: v for k, v in payload.items() if k in allowed}
	if not update:
		return Response({"detail": "No updatable fields provided"}, status=drf_status.HTTP_400_BAD_REQUEST)
	saved = upsert_profile(uid, update)
	return Response(saved)


@api_view(["GET"])
def me_stats(request):
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	bookings = list_bookings_for_user(uid, limit=1000)
	total = len(bookings)
	completed = len([b for b in bookings if b.get("status") == "completed"])
	pending = len([b for b in bookings if b.get("status") == "pending"])
	return Response({"total": total, "completed": completed, "pending": pending})


@api_view(["GET"])
def admin_users(request):
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)

	# Fetch auth users and merge with profile and role info so all accounts appear
	auth_users = list_auth_users()
	profiles_map = list_profiles_map()
	roles_map = list_roles_map()

	enriched = []
	seen = set()
	for u in auth_users:
		uid2 = u.get("id")
		p = profiles_map.get(uid2, {})
		role_val = roles_map.get(uid2)
		roles = [role_val] if role_val else []
		enriched.append({
			"id": uid2,
			"name": (p.get("name") or u.get("name") or "").strip(),
			"email": (p.get("email") or u.get("email") or "").strip(),
			"phone": p.get("phone"),
			"address": p.get("address"),
			"created_at": p.get("created_at") or u.get("created_at"),
			"roles": roles,
		})
		seen.add(uid2)

	# Include any profile docs without a corresponding auth user (edge cases)
	for pid, p in profiles_map.items():
		if pid in seen:
			continue
		role_val = roles_map.get(pid)
		roles = [role_val] if role_val else []
		enriched.append({
			"id": p.get("id"),
			"name": p.get("name", ""),
			"email": p.get("email", ""),
			"phone": p.get("phone"),
			"address": p.get("address"),
			"created_at": p.get("created_at"),
			"roles": roles,
		})

	# Sort by created_at desc when available
	enriched.sort(key=lambda x: x.get("created_at", ""), reverse=True)
	return Response(enriched)


@api_view(["POST"])
def admin_set_user_role(request, user_id: str):
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)

	payload = request.data or {}
	new_role = payload.get("role")
	if new_role not in {"admin", "user"}:
		return Response({"detail": "Invalid role"}, status=drf_status.HTTP_400_BAD_REQUEST)
	updated = set_user_role(user_id, new_role)
	return Response(updated)


@api_view(["GET", "POST"])
def categories(request):
	"""Categories API
	GET: list categories (public)
	POST: create a category (admin only) with JSON { name }
	"""
	if request.method == "GET":
		return Response(list_categories())

	# POST admin only
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)

	name = (request.data or {}).get("name")
	if not name or not str(name).strip():
		return Response({"detail": "'name' is required"}, status=drf_status.HTTP_400_BAD_REQUEST)
	created = create_category(str(name).strip())
	return Response(created, status=drf_status.HTTP_201_CREATED)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def upload_service_image(request):
	"""Accepts multipart/form-data with field 'file'. Admin only. Stores the image in MEDIA_ROOT/services and returns {url}."""
	if not request.user or not request.user.is_authenticated:
		return Response({"detail": "Authentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
	uid = getattr(request.user, "firebase_uid", None)
	role = get_user_role(uid) if uid else None
	if not role or role.get("role") != "admin":
		return Response({"detail": "Admin privileges required"}, status=drf_status.HTTP_403_FORBIDDEN)

	file = request.FILES.get("file")
	if not file:
		return Response({"detail": "No file uploaded (expected field 'file')"}, status=drf_status.HTTP_400_BAD_REQUEST)

	# Create a safe unique filename
	name, ext = os.path.splitext(file.name)
	ext = ext.lower() or ".jpg"
	filename = f"{uuid.uuid4().hex}{ext}"
	rel_path = os.path.join("services", filename)
	saved_path = default_storage.save(rel_path, file)

	url = request.build_absolute_uri(os.path.join(settings.MEDIA_URL, saved_path).replace("\\", "/"))
	return Response({"url": url})
