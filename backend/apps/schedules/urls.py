# backend/apps/schedules/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MusaitlikView,
    VardiyaListAPIView,
    BenimVardiyalarimListView,
    PlanOlusturView,
    VardiyaIstekView,
    VardiyaIstegiYanitlaView,
    AdminIstekListView,
    AdminIstekActionView,
    VardiyaIptalIstegiOlusturView,
    AdminIptalIstekListView,
    AdminIptalIstekAksiyonView,
    UygunCalisanListView,
    VardiyaIstegiGeriCekView,
    VardiyaIptalIstegiGeriCekView,
    KendiIptalIsteklerimListView,
    CalisanTercihiViewSet,
    KisitlamaKuraliViewSet,
    VardiyaBaslatBitirView,
    AdminIstatistiklerView,
)

router = DefaultRouter()
router.register(r'tercihler', CalisanTercihiViewSet, basename='tercih')
router.register(r'kurallar', KisitlamaKuraliViewSet, basename='kural')

urlpatterns = [
    path('', include(router.urls)),
    # Genel
    path('musaitlik/', MusaitlikView.as_view(), name='musaitlik'),
    path('vardiyalar/', VardiyaListAPIView.as_view(), name='vardiya-list'),
    path('vardiyalarim/', BenimVardiyalarimListView.as_view(), name='benim-vardiyalarim'),
    path('plan-olustur/', PlanOlusturView.as_view(), name='plan-olustur'),
    path('vardiyalar/<int:vardiya_id>/uygun-calisanlar/', UygunCalisanListView.as_view(), name='uygun-calisan-list'),

    # Vardiya Takas İstekleri
    path('istekler/', VardiyaIstekView.as_view(), name='takas-istek-list-create'),
    path('istekler/<int:pk>/yanitla/', VardiyaIstegiYanitlaView.as_view(), name='takas-istek-yanitla'),
    path('admin/istekler/', AdminIstekListView.as_view(), name='admin-takas-istek-list'),
    path('admin/istekler/<int:pk>/aksiyon/', AdminIstekActionView.as_view(), name='admin-takas-istek-aksiyon'),

    # Vardiya İptal İstekleri (YENİ)
    path('iptal-istekleri/', VardiyaIptalIstegiOlusturView.as_view(), name='iptal-istek-olustur'),
    path('admin/iptal-istekleri/', AdminIptalIstekListView.as_view(), name='admin-iptal-istek-list'),
    path('admin/iptal-istekleri/<int:pk>/aksiyon/', AdminIptalIstekAksiyonView.as_view(), name='admin-iptal-istek-aksiyon'),
    path('iptal-isteklerim/', KendiIptalIsteklerimListView.as_view(), name='kendi-iptal-isteklerim'),
    # İstek Geri Çekme (YENİ)
    path('istekler/<int:pk>/geri-cek/', VardiyaIstegiGeriCekView.as_view(), name='takas-istek-geri-cek'),
    path('iptal-istekleri/<int:pk>/geri-cek/', VardiyaIptalIstegiGeriCekView.as_view(), name='iptal-istek-geri-cek'),
    
    # QR Kod ile Vardiya Kontrol
    path('vardiyalar/<int:vardiya_id>/kontrol/', VardiyaBaslatBitirView.as_view(), name='vardiya-kontrol'),
    
    # Admin İstatistikler
    path('admin/istatistikler/', AdminIstatistiklerView.as_view(), name='admin-istatistikler'),

]