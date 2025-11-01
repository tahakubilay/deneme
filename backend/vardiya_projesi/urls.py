# backend/vardiya_projesi/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/subeler/', include('apps.branches.urls')),
    path('api/kullanicilar/', include('apps.users.urls')),
    # --- BU SATIRIN DOĞRU OLDUĞUNDAN EMİN OLUN ---
    path('api/schedules/', include('apps.schedules.urls')),
    # ----------------------------------------------
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)