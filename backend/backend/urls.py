"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from core import views as core_views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Simple API endpoint for frontend connectivity checks
    path('api/status/', core_views.status, name='api-status'),

    # JWT auth endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User registration
    path('api/register/', core_views.register, name='api-register'),
    # Services (example Firestore-backed endpoints)
    path('api/services/', core_views.services_list, name='api-services'),
    path('api/bookings/', core_views.bookings, name='api-bookings'),
    path('api/services/<str:service_id>/', core_views.service_detail, name='api-service-detail'),
    path('api/bookings/<str:booking_id>/', core_views.booking_detail, name='api-booking-detail'),
    path('api/admin/bookings/', core_views.admin_bookings, name='api-admin-bookings'),
    path('api/me/', core_views.me, name='api-me'),
    path('api/me/stats/', core_views.me_stats, name='api-me-stats'),
    path('api/admin/users/', core_views.admin_users, name='api-admin-users'),
    path('api/admin/users/<str:user_id>/role/', core_views.admin_set_user_role, name='api-admin-set-user-role'),
    path('api/categories/', core_views.categories, name='api-categories'),
    path('api/uploads/service-image/', core_views.upload_service_image, name='api-upload-service-image'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
