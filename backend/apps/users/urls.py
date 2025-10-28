# backend/apps/users/urls.py - TAMAMI

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, ProfilView, AdminProfilOnayView

# Bir router oluşturuyoruz
router = DefaultRouter()
# UserViewSet'i router'a kaydediyoruz (liste/ öneki olmadan)
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    # Profil Yönetimi - ÖNCE (çakışma olmaması için)
    path('profil/', ProfilView.as_view(), name='profil'),
    path('admin/profil-talepleri/', AdminProfilOnayView.as_view(), name='admin-profil-talepleri'),
    path('admin/profil-talepleri/<int:talep_id>/', AdminProfilOnayView.as_view(), name='admin-profil-talep-detay'),
    
    # Router URL'leri SONRA
    path('', include(router.urls)),
]
