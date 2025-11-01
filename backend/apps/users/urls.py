# backend/apps/users/urls.py - TAMAMI

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, ProfilView, AdminProfilOnayView, TopluKullaniciIceAktarView, ProfilGecmisiView, ProfilTalebiView

# Bir router oluşturuyoruz
router = DefaultRouter()
# UserViewSet'i router'a kaydediyoruz (liste/ öneki olmadan)
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('profil/', ProfilView.as_view(), name='profil'),
    path('profil-talebi/', ProfilTalebiView.as_view(), name='profil-talebi'),  # Varsa
    path('profil-gecmis/', ProfilGecmisiView.as_view(), name='profil-gecmis'),  # YENİ
    path('admin/profil-talepleri/', AdminProfilOnayView.as_view(), name='admin-profil-talepleri'),
    path('admin/profil-talepleri/<int:talep_id>/', AdminProfilOnayView.as_view(), name='admin-profil-talep-detay'),
    path('toplu-ice-aktar/', TopluKullaniciIceAktarView.as_view(), name='toplu-kullanici-ice-aktar'),
    
    #Router URL'leri sona ekleniyor
    path('', include(router.urls)),
]