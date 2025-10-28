# backend/apps/schedules/views.py

from django.db.models import Q
from django.db import transaction
from django.core.management import call_command
from django.http import JsonResponse
from datetime import datetime
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Q, F
from django.db.models.functions import TruncMonth
import secrets
from datetime import timedelta


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions, viewsets

from apps.users.models import CustomUser
from .models import Musaitlik, Vardiya, VardiyaIstegi, VardiyaIptalIstegi, CalisanTercihi, KisitlamaKurali
from .serializers import (
    MusaitlikSerializer, VardiyaSerializer, VardiyaIstegiCreateSerializer, 
    VardiyaIstegiListSerializer, VardiyaIptalIstegiCreateSerializer, VardiyaIptalIstegiListSerializer,
    CalisanTercihiSerializer,
    KisitlamaKuraliSerializer
)
from .choices import IstekTipi, IstekDurum, VardiyaDurum, Gunler, MusaitlikDurum

class VardiyaBaslatBitirView(APIView):
    """QR kod ile vardiya başlatma/bitirme"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, vardiya_id, *args, **kwargs):
        action = request.data.get('action')  # 'baslat' veya 'bitir'
        qr_token = request.data.get('qr_token')  # Şube QR kodundan gelen token
        
        try:
            vardiya = Vardiya.objects.get(id=vardiya_id, calisan=request.user)
        except Vardiya.DoesNotExist:
            return Response({'hata': 'Vardiya bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
        
        # QR token kontrolü (şube ile eşleşmeli)
        expected_token = f"sube_{vardiya.sube.id}_qr"
        if qr_token != expected_token:
            return Response({'hata': 'QR kod şube ile eşleşmiyor!'}, status=status.HTTP_400_BAD_REQUEST)
        
        now = timezone.now()
        
        if action == 'baslat':
            if vardiya.durum != VardiyaDurum.PLANLANDI:
                return Response({'hata': 'Bu vardiya başlatılamaz.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 15 dakika erken başlatmaya izin ver
            if now < vardiya.baslangic_zamani - timedelta(minutes=15):
                return Response({'hata': 'Vardiya başlama saati henüz gelmedi.'}, status=status.HTTP_400_BAD_REQUEST)
            
            vardiya.gercek_baslangic_zamani = now
            vardiya.durum = VardiyaDurum.BASLATILDI
            vardiya.save()
            
            return Response({
                'mesaj': 'Vardiya başarıyla başlatıldı!',
                'baslangic_zamani': vardiya.gercek_baslangic_zamani
            })
        
        elif action == 'bitir':
            if vardiya.durum != VardiyaDurum.BASLATILDI:
                return Response({'hata': 'Vardiya henüz başlatılmadı.'}, status=status.HTTP_400_BAD_REQUEST)
            
            vardiya.gercek_bitis_zamani = now
            vardiya.durum = VardiyaDurum.TAMAMLANDI
            vardiya.save()
            
            # Çalışılan süreyi hesapla
            calisilan_sure = (vardiya.gercek_bitis_zamani - vardiya.gercek_baslangic_zamani).total_seconds() / 3600
            
            return Response({
                'mesaj': 'Vardiya başarıyla tamamlandı!',
                'bitis_zamani': vardiya.gercek_bitis_zamani,
                'calisilan_sure': round(calisilan_sure, 2)
            })
        
        return Response({'hata': 'Geçersiz işlem.'}, status=status.HTTP_400_BAD_REQUEST)

class ProfilView(APIView):
    """Çalışan profil görüntüleme ve düzenleme talebi"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        serializer = CustomUserSerializer(user)
        return Response(serializer.data)
    
    def post(self, request):
        """Profil güncelleme talebi oluştur"""
        user = request.user
        
        # Bekleyen talep var mı kontrol et
        bekleyen_talep = ProfilGuncellemeTalebi.objects.filter(
            calisan=user,
            durum='beklemede'
        ).exists()
        
        if bekleyen_talep:
            return Response(
                {'hata': 'Zaten beklemede olan bir güncelleme talebiniz var.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Yeni talep oluştur
        talep = ProfilGuncellemeTalebi.objects.create(
            calisan=user,
            yeni_telefon=request.data.get('telefon'),
            yeni_adres=request.data.get('adres'),
            yeni_profil_resmi=request.FILES.get('profil_resmi')
        )
        
        return Response({
            'mesaj': 'Profil güncelleme talebiniz yönetici onayına gönderildi.',
            'talep_id': talep.id
        }, status=status.HTTP_201_CREATED)


class AdminProfilOnayView(APIView):
    """Admin için profil güncelleme taleplerini yönetme"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Bekleyen talepleri listele"""
        talepler = ProfilGuncellemeTalebi.objects.filter(
            durum='beklemede'
        ).select_related('calisan')
        
        data = [{
            'id': t.id,
            'calisan': f"{t.calisan.first_name} {t.calisan.last_name}",
            'calisan_id': t.calisan.id,
            'yeni_telefon': t.yeni_telefon,
            'yeni_adres': t.yeni_adres,
            'profil_resmi_var': bool(t.yeni_profil_resmi),
            'olusturma_tarihi': t.olusturma_tarihi
        } for t in talepler]
        
        return Response(data)
    
    def post(self, request, talep_id):
        """Talebi onayla/reddet"""
        try:
            talep = ProfilGuncellemeTalebi.objects.get(id=talep_id)
        except ProfilGuncellemeTalebi.DoesNotExist:
            return Response({'hata': 'Talep bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
        
        action = request.data.get('action')
        
        if action == 'onayla':
            with transaction.atomic():
                user = talep.calisan
                
                if talep.yeni_telefon:
                    user.telefon = talep.yeni_telefon
                if talep.yeni_adres:
                    user.adres = talep.yeni_adres
                if talep.yeni_profil_resmi:
                    user.profil_resmi = talep.yeni_profil_resmi
                
                user.save()
                talep.durum = 'onaylandi'
                talep.save()
            
            return Response({'mesaj': 'Profil güncelleme talebi onaylandı ve uygulandı.'})
        
        elif action == 'reddet':
            talep.durum = 'reddedildi'
            talep.save()
            return Response({'mesaj': 'Talep reddedildi.'})
        
        return Response({'hata': 'Geçersiz işlem.'}, status=status.HTTP_400_BAD_REQUEST)


class CalisanTercihiViewSet(viewsets.ModelViewSet):
    """Çalışanların favori gün/şube tercihlerini yönetmek için ViewSet."""
    queryset = CalisanTercihi.objects.select_related('calisan', 'sube').all()
    serializer_class = CalisanTercihiSerializer
    permission_classes = [permissions.IsAdminUser]

class KisitlamaKuraliViewSet(viewsets.ModelViewSet):
    """Kısıtlama kurallarını yönetmek için ViewSet."""
    queryset = KisitlamaKurali.objects.select_related('sube').all()
    serializer_class = KisitlamaKuraliSerializer
    permission_classes = [permissions.IsAdminUser]

class MusaitlikView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        current_donem = "2025-10" # Bu dönemi dinamik hale getirmek sonraki adım olabilir
        musaitlikler = Musaitlik.objects.filter(calisan=request.user, donem=current_donem)
        serializer = MusaitlikSerializer(musaitlikler, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        yeni_sablon = request.data.get('sablon', [])
        current_donem = "2025-10"
        
        Musaitlik.objects.filter(calisan=request.user, donem=current_donem).delete()
        
        for item in yeni_sablon:
            Musaitlik.objects.create(
                calisan=request.user,
                gun=item['gun'],
                musaitlik_durumu=item['musaitlik_durumu'],
                donem=current_donem
            )
        
        return Response({'message': 'Müsaitlik durumu başarıyla güncellendi.'}, status=status.HTTP_201_CREATED)

class VardiyaListAPIView(generics.ListAPIView):
    queryset = Vardiya.objects.filter(durum='taslak').order_by('baslangic_zamani')
    serializer_class = VardiyaSerializer
    permission_classes = [permissions.IsAuthenticated]

class BenimVardiyalarimListView(generics.ListAPIView):
    serializer_class = VardiyaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Vardiya.objects.filter(
            calisan=self.request.user,
            durum__in=['taslak', 'planlandi', 'iptal_istegi'], 
            baslangic_zamani__gte=datetime.now()
        ).order_by('baslangic_zamani')

class VardiyaIstekView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        istekler = VardiyaIstegi.objects.filter(Q(istek_yapan=user) | Q(hedef_calisan=user)).order_by('-olusturulma_tarihi')
        serializer = VardiyaIstegiListSerializer(istekler, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = VardiyaIstegiCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                istek_tipi=IstekTipi.TAKAS,
                durum=IstekDurum.HEDEF_ONAYI_BEKLIYOR
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VardiyaIstegiYanitlaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            istek = VardiyaIstegi.objects.get(pk=pk, hedef_calisan=request.user)
        except VardiyaIstegi.DoesNotExist:
            return Response({'hata': 'İstek bulunamadı veya bu isteğe yanıt verme yetkiniz yok.'}, status=status.HTTP_404_NOT_FOUND)

        yanit = request.data.get('yanit')
        
        if yanit == 'onayla':
            istek.durum = IstekDurum.ADMIN_ONAYI_BEKLIYOR
            istek.save()
            return Response({'mesaj': 'İstek onaylandı ve admin onayına gönderildi.'})
        elif yanit == 'reddet':
            istek.durum = IstekDurum.REDDEDILDI
            istek.save()
            return Response({'mesaj': 'İstek reddedildi.'})
        else:
            return Response({'hata': 'Geçersiz yanıt. Yanıt "onayla" veya "reddet" olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

class AdminIstekListView(generics.ListAPIView):
    serializer_class = VardiyaIstegiListSerializer
    permission_classes = [permissions.IsAdminUser]
    def get_queryset(self):
        return VardiyaIstegi.objects.filter(durum=IstekDurum.ADMIN_ONAYI_BEKLIYOR).order_by('olusturulma_tarihi')

class AdminIstekActionView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request, pk, *args, **kwargs):
        try:
            istek = VardiyaIstegi.objects.get(pk=pk, durum=IstekDurum.ADMIN_ONAYI_BEKLIYOR)
        except VardiyaIstegi.DoesNotExist:
            return Response({'hata': 'İstek bulunamadı veya zaten işlenmiş.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')

        if action == 'onayla':
            vardiya1 = istek.istek_yapan_vardiya
            vardiya2 = istek.hedef_vardiya
            calisan1 = vardiya1.calisan
            calisan2 = vardiya2.calisan
            
            with transaction.atomic():
                vardiya1.calisan, vardiya2.calisan = calisan2, calisan1
                vardiya1.save()
                vardiya2.save()
                istek.durum = IstekDurum.ONAYLANDI
                istek.save()
            
            return Response({'mesaj': 'Takas başarıyla onaylandı ve vardiyalar değiştirildi.'})
        
        elif action == 'reddet':
            istek.durum = IstekDurum.REDDEDILDI
            istek.save()
            return Response({'mesaj': 'İstek reddedildi.'})
        
        else:
            return Response({'hata': 'Geçersiz eylem. "onayla" veya "reddet" gönderilmeli.'}, status=status.HTTP_400_BAD_REQUEST)

class PlanOlusturView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request, *args, **kwargs):
        donem = request.data.get('donem')
        if not donem or len(donem.split('-')) != 2:
            return Response({'hata': 'Lütfen geçerli bir dönem belirtin (YYYY-AA).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            call_command('create_schedule', donem)
            return Response({'mesaj': f'{donem} dönemi için plan başarıyla oluşturuldu.'})
        except Exception as e:
            return Response({'hata': f'Plan oluşturulurken bir hata oluştu: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VardiyaIptalIstegiOlusturView(generics.CreateAPIView):
    queryset = VardiyaIptalIstegi.objects.all()
    serializer_class = VardiyaIptalIstegiCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        vardiya_id = request.data.get('vardiya')
        try:
            vardiya = Vardiya.objects.get(id=vardiya_id)
        except Vardiya.DoesNotExist:
            return Response({'hata': 'Böyle bir vardiya bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        if vardiya.calisan != request.user:
            return Response({'hata': 'Sadece kendi vardiyalarınız için iptal isteği gönderebilirsiniz.'}, status=status.HTTP_403_FORBIDDEN)
        
        if vardiya.durum not in [VardiyaDurum.PLANLANDI, VardiyaDurum.TASLAK]:
            return Response({'hata': f'Bu vardiya için iptal isteği gönderilemez (Durum: {vardiya.get_durum_display()}).'}, status=status.HTTP_400_BAD_REQUEST)
        
        if hasattr(vardiya, 'iptal_istegi') and vardiya.iptal_istegi.durum == IstekDurum.ADMIN_ONAYI_BEKLIYOR:
             return Response({'hata': 'Bu vardiya için zaten beklemede olan bir iptal isteği mevcut.'}, status=status.HTTP_400_BAD_REQUEST)

        if VardiyaIstegi.objects.filter(Q(istek_yapan_vardiya=vardiya) | Q(hedef_vardiya=vardiya), durum__in=[IstekDurum.HEDEF_ONAYI_BEKLIYOR, IstekDurum.ADMIN_ONAYI_BEKLIYOR]).exists():
            return Response({'hata': 'Bu vardiya bir takas teklifinde kullanıldığı için iptal edilemez.'}, status=status.HTTP_400_BAD_REQUEST)

        orijinal_durum = vardiya.durum
        vardiya.durum = VardiyaDurum.IPTAL_ISTEGI
        
        istek = VardiyaIptalIstegi.objects.create(
            vardiya=vardiya,
            istek_yapan=request.user,
            orijinal_vardiya_durumu=orijinal_durum,
            durum=IstekDurum.ADMIN_ONAYI_BEKLIYOR
        )
        
        vardiya.save()
        
        serializer = self.get_serializer(istek)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class AdminIptalIstekListView(generics.ListAPIView):
    serializer_class = VardiyaIptalIstegiListSerializer
    permission_classes = [permissions.IsAdminUser]
    def get_queryset(self):
        return VardiyaIptalIstegi.objects.filter(durum=IstekDurum.ADMIN_ONAYI_BEKLIYOR).order_by('olusturulma_tarihi')

class AdminIptalIstekAksiyonView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request, pk, *args, **kwargs):
        try:
            istek = VardiyaIptalIstegi.objects.get(pk=pk, durum=IstekDurum.ADMIN_ONAYI_BEKLIYOR)
        except VardiyaIptalIstegi.DoesNotExist:
            return Response({'hata': 'İptal isteği bulunamadı veya zaten işlenmiş.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        vardiya = istek.vardiya

        if action == 'reddet':
            with transaction.atomic():
                istek.durum = IstekDurum.REDDEDILDI
                istek.save()
                vardiya.durum = istek.orijinal_vardiya_durumu
                vardiya.save()
            return Response({'mesaj': 'İptal isteği reddedildi.'})

        elif action == 'onayla':
            yeni_calisan_id = request.data.get('yeni_calisan_id')

            if not yeni_calisan_id:
                with transaction.atomic():
                    istek.durum = IstekDurum.ONAYLANDI
                    istek.save()
                    vardiya.durum = VardiyaDurum.IPTAL
                    vardiya.calisan = None
                    vardiya.save()
                return Response({'mesaj': 'Vardiya başarıyla iptal edildi.'})

            else:
                try:
                    yeni_calisan = CustomUser.objects.get(id=yeni_calisan_id)
                except CustomUser.DoesNotExist:
                    return Response({'hata': 'Atanmak istenen yeni çalışan bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
                
                with transaction.atomic():
                    vardiya.calisan = yeni_calisan
                    vardiya.durum = istek.orijinal_vardiya_durumu
                    vardiya.save()
                    istek.durum = IstekDurum.ONAYLANDI
                    istek.save()
                
                return Response({'mesaj': f'Vardiya başarıyla {yeni_calisan.get_full_name()} adlı çalışana atandı.'})

        else:
            return Response({'hata': 'Geçersiz eylem. "onayla" veya "reddet" gönderilmeli.'}, status=status.HTTP_400_BAD_REQUEST)

class UygunCalisanListView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request, vardiya_id, *args, **kwargs):
        try:
            vardiya = Vardiya.objects.get(id=vardiya_id)
        except Vardiya.DoesNotExist:
            return Response({'hata': 'Vardiya bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
        baslangic = vardiya.baslangic_zamani
        bitis = vardiya.bitis_zamani
        gun_numarasi = baslangic.isoweekday()
        donem = baslangic.strftime('%Y-%m')
        cakisan_vardiyasi_olanlar = Vardiya.objects.filter(baslangic_zamani__lt=bitis, bitis_zamani__gt=baslangic, durum__in=[VardiyaDurum.PLANLANDI, VardiyaDurum.TASLAK]).values_list('calisan_id', flat=True)
        musait_olmayanlar = Musaitlik.objects.filter(donem=donem, gun=gun_numarasi, musaitlik_durumu=MusaitlikDurum.MUSAIT_DEGIL).values_list('calisan_id', flat=True)
        orijinal_calisan_id = [vardiya.calisan.id] if vardiya.calisan else []
        dislanacak_calisan_idler = set(list(cakisan_vardiyasi_olanlar) + list(musait_olmayanlar) + orijinal_calisan_id)
        uygun_calisanlar = CustomUser.objects.filter(is_active=True, rol='calisan').exclude(id__in=dislanacak_calisan_idler)
        data = [{'id': user.id, 'ad_soyad': user.get_full_name(), 'username': user.username} for user in uygun_calisanlar]
        return Response(data)

class VardiyaIstegiGeriCekView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, pk, *args, **kwargs):
        try:
            istek = VardiyaIstegi.objects.get(pk=pk, istek_yapan=request.user)
        except VardiyaIstegi.DoesNotExist:
            return Response({'hata': 'İstek bulunamadı veya bu isteğe erişim yetkiniz yok.'}, status=status.HTTP_404_NOT_FOUND)
        if istek.durum not in [IstekDurum.HEDEF_ONAYI_BEKLIYOR, IstekDurum.ADMIN_ONAYI_BEKLIYOR]:
            return Response({'hata': 'Sadece beklemede olan istekler geri çekilebilir.'}, status=status.HTTP_400_BAD_REQUEST)
        istek.delete()
        return Response({'mesaj': 'Takas isteği başarıyla geri çekildi.'}, status=status.HTTP_200_OK)

class VardiyaIptalIstegiGeriCekView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, pk, *args, **kwargs):
        try:
            istek = VardiyaIptalIstegi.objects.get(pk=pk, istek_yapan=request.user)
        except VardiyaIptalIstegi.DoesNotExist:
            return Response({'hata': 'İptal isteği bulunamadı veya bu isteğe erişim yetkiniz yok.'}, status=status.HTTP_404_NOT_FOUND)

        if istek.durum != IstekDurum.ADMIN_ONAYI_BEKLIYOR:
            return Response({'hata': 'Sadece admin onayı bekleyen iptal istekleri geri çekilebilir.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            vardiya = istek.vardiya
            vardiya.durum = istek.orijinal_vardiya_durumu
            vardiya.save()
            istek.delete()
        
        return Response({'mesaj': 'Vardiya iptal isteği başarıyla geri çekildi.'}, status=status.HTTP_200_OK)

class KendiIptalIsteklerimListView(generics.ListAPIView):
    """Giriş yapmış kullanıcının kendi gönderdiği iptal isteklerini listeler."""
    serializer_class = VardiyaIptalIstegiListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VardiyaIptalIstegi.objects.filter(istek_yapan=self.request.user).order_by('-olusturulma_tarihi')

class AdminIstatistiklerView(APIView):
    """Admin için detaylı istatistikler"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request, *args, **kwargs):
        try:
            # Tarih filtresi
            baslangic = request.query_params.get('baslangic', 
                (timezone.now() - timedelta(days=90)).strftime('%Y-%m-%d'))
            bitis = request.query_params.get('bitis', 
                timezone.now().strftime('%Y-%m-%d'))
            
            # 1. Genel İstatistikler
            toplam_vardiya = Vardiya.objects.filter(
                baslangic_zamani__range=[baslangic, bitis]
            ).count()
            
            tamamlanan_vardiya = Vardiya.objects.filter(
                baslangic_zamani__range=[baslangic, bitis],
                durum=VardiyaDurum.TAMAMLANDI
            ).count()
            
            iptal_edilen = Vardiya.objects.filter(
                baslangic_zamani__range=[baslangic, bitis],
                durum=VardiyaDurum.IPTAL
            ).count()
            
            # 2. Çalışan Performansı
            calisan_performans_list = []
            tamamlanan_vardiyalar = Vardiya.objects.filter(
                baslangic_zamani__range=[baslangic, bitis],
                durum=VardiyaDurum.TAMAMLANDI,
                gercek_baslangic_zamani__isnull=False,
                gercek_bitis_zamani__isnull=False,
                calisan__isnull=False
            ).select_related('calisan')
            
            # Çalışan bazlı gruplama
            from collections import defaultdict
            calisan_data = defaultdict(lambda: {'toplam_vardiya': 0, 'toplam_saat': 0})
            
            for vardiya in tamamlanan_vardiyalar:
                if vardiya.calisan:
                    key = vardiya.calisan.id
                    calisan_data[key]['calisan__id'] = vardiya.calisan.id
                    calisan_data[key]['calisan__first_name'] = vardiya.calisan.first_name
                    calisan_data[key]['calisan__last_name'] = vardiya.calisan.last_name
                    calisan_data[key]['toplam_vardiya'] += 1
                    
                    # Süre hesaplama
                    sure = (vardiya.gercek_bitis_zamani - vardiya.gercek_baslangic_zamani).total_seconds() / 3600
                    calisan_data[key]['toplam_saat'] += sure
            
            calisan_performans = sorted(
                calisan_data.values(), 
                key=lambda x: x['toplam_saat'], 
                reverse=True
            )[:10]
            
            # 3. Şube Bazlı İstatistikler
            sube_istatistik = Vardiya.objects.filter(
                baslangic_zamani__range=[baslangic, bitis]
            ).values(
                'sube__sube_adi',
                'sube__id'
            ).annotate(
                toplam_vardiya=Count('id'),
                tamamlanan=Count('id', filter=Q(durum=VardiyaDurum.TAMAMLANDI)),
                iptal=Count('id', filter=Q(durum=VardiyaDurum.IPTAL))
            )
            
            # 4. Aylık Trend
            aylik_trend = Vardiya.objects.filter(
                baslangic_zamani__range=[baslangic, bitis]
            ).annotate(
                ay=TruncMonth('baslangic_zamani')
            ).values('ay').annotate(
                toplam=Count('id'),
                tamamlanan=Count('id', filter=Q(durum=VardiyaDurum.TAMAMLANDI))
            ).order_by('ay')
            
            # 5. Takas/İptal İstatistikleri
            bekleyen_takas = VardiyaIstegi.objects.filter(
                durum__in=[IstekDurum.HEDEF_ONAYI_BEKLIYOR, IstekDurum.ADMIN_ONAYI_BEKLIYOR]
            ).count()
            
            bekleyen_iptal = VardiyaIptalIstegi.objects.filter(
                durum=IstekDurum.ADMIN_ONAYI_BEKLIYOR
            ).count()
            
            # Tamamlanma oranı hesaplama
            tamamlanma_orani = round((tamamlanan_vardiya / toplam_vardiya * 100) if toplam_vardiya > 0 else 0, 2)
            
            return Response({
                'genel': {
                    'toplam_vardiya': toplam_vardiya,
                    'tamamlanan_vardiya': tamamlanan_vardiya,
                    'iptal_edilen': iptal_edilen,
                    'tamamlanma_orani': tamamlanma_orani
                },
                'calisan_performans': calisan_performans,
                'sube_istatistik': list(sube_istatistik),
                'aylik_trend': list(aylik_trend),
                'bekleyen_islemler': {
                    'takas': bekleyen_takas,
                    'iptal': bekleyen_iptal
                }
            })
        
        except Exception as e:
            import traceback
            print("İstatistik Hatası:", str(e))
            print(traceback.format_exc())
            return Response(
                {'hata': f'İstatistikler yüklenirken hata oluştu: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )