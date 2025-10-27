# backend/apps/schedules/views.py

from django.db.models import Q
from django.db import transaction
from django.core.management import call_command
from django.http import JsonResponse
from datetime import datetime, timedelta

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
