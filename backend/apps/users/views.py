# backend/apps/users/views.py - TAMAMI

from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import CustomUser, ProfilGuncellemeTalebi
from .serializers import CustomUserSerializer
from rest_framework.parsers import MultiPartParser, FormParser
import pandas as pd

class UserViewSet(viewsets.ModelViewSet):
    """
    Bu viewset, kullanıcılar için listeleme, oluşturma, güncelleme ve silme
    işlemlerini otomatik olarak sağlar.
    """
    queryset = CustomUser.objects.all().order_by('first_name')
    serializer_class = CustomUserSerializer

    def get_permissions(self):
        if self.action == 'list':
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            self.permission_classes = [permissions.IsAdminUser]
        return super().get_permissions()


class ProfilView(APIView):
    """Çalışan profil görüntüleme ve düzenleme talebi"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        serializer = CustomUserSerializer(user, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        user = request.user
        
        # ADMIN İSE DOĞRUDAN GÜNCELLENSİN
        if user.is_staff:
            if request.data.get('telefon'):
                user.telefon = request.data.get('telefon')
            if request.data.get('adres'):
                user.adres = request.data.get('adres')
            if request.FILES.get('profil_resmi'):
                user.profil_resmi = request.FILES.get('profil_resmi')
            
            user.save()
            
            return Response({
                'mesaj': 'Profil başarıyla güncellendi.',
            }, status=status.HTTP_200_OK)
        
        # ÇALIŞAN İSE ONAY SÜRECİ
        bekleyen_talep = ProfilGuncellemeTalebi.objects.filter(
            calisan=user,
            durum='beklemede'
        ).exists()
        
        if bekleyen_talep:
            return Response(
                {'hata': 'Zaten beklemede olan bir güncelleme talebiniz var.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # YENİ: Eski değerleri kaydet
        talep = ProfilGuncellemeTalebi.objects.create(
            calisan=user,
            eski_telefon=user.telefon,  # ← ESKİ DEĞER
            yeni_telefon=request.data.get('telefon'),
            eski_adres=user.adres,  # ← ESKİ DEĞER
            yeni_adres=request.data.get('adres'),
            eski_profil_resmi=user.profil_resmi,  # ← ESKİ DEĞER
            yeni_profil_resmi=request.FILES.get('profil_resmi')
        )
        
        return Response({
            'mesaj': 'Profil güncelleme talebiniz yönetici onayına gönderildi.',
            'talep_id': talep.id
        }, status=status.HTTP_201_CREATED)

class ProfilTalebiView(APIView):
    """Çalışanın bekleyen profil talebini getir"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            talep = ProfilGuncellemeTalebi.objects.get(
                calisan=request.user,
                durum='beklemede'
            )
            return Response({
                'id': talep.id,
                'yeni_telefon': talep.yeni_telefon,
                'yeni_adres': talep.yeni_adres,
                'profil_resmi_var': bool(talep.yeni_profil_resmi),
                'olusturma_tarihi': talep.olusturma_tarihi
            })
        except ProfilGuncellemeTalebi.DoesNotExist:
            return Response({'hata': 'Bekleyen talep yok.'}, status=status.HTTP_404_NOT_FOUND)

class ProfilGecmisiView(APIView):
    """Kullanıcının profil güncelleme geçmişi"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        talepler = ProfilGuncellemeTalebi.objects.filter(
            calisan=request.user
        ).order_by('-olusturma_tarihi')
        
        data = [{
            'id': t.id,
            'durum': t.durum,
            'yeni_telefon': t.yeni_telefon,
            'yeni_adres': t.yeni_adres,
            'profil_resmi_var': bool(t.yeni_profil_resmi),
            'olusturma_tarihi': t.olusturma_tarihi,
            'karar_tarihi': t.karar_tarihi
        } for t in talepler]
        
        return Response(data)


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
            # ESKİ DEĞERLER
            'eski_telefon': t.eski_telefon,
            'eski_adres': t.eski_adres,
            'eski_profil_resmi_var': bool(t.eski_profil_resmi),
            # YENİ DEĞERLER
            'yeni_telefon': t.yeni_telefon,
            'yeni_adres': t.yeni_adres,
            'yeni_profil_resmi_var': bool(t.yeni_profil_resmi),
            'olusturma_tarihi': t.olusturma_tarihi
        } for t in talepler]
        
        return Response(data)
    
    # post metodu aynı kalacak
    
class TopluKullaniciIceAktarView(APIView):
    """Excel'den toplu kullanıcı içe aktarma"""
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser]
    
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'hata': 'Dosya bulunamadı.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            df = pd.read_excel(file)
            df = df.where(pd.notnull(df), None)
            
            eklenen = 0
            guncellenen = 0
            
            for index, row in df.iterrows():
                username = row.get('username')
                if not username:
                    continue
                
                user, created = CustomUser.objects.update_or_create(
                    username=username,
                    defaults={
                        'first_name': row.get('first_name', ''),
                        'last_name': row.get('last_name', ''),
                        'email': row.get('email', f'{username}@example.com'),  # Varsayılan email
                        'telefon': str(row.get('telefon', '')),
                        'adres': row.get('adres', ''),
                        'enlem': row.get('enlem'),
                        'boylam': row.get('boylam'),
                        'cinsiyet': row.get('cinsiyet'),
                        'rol': 'calisan',
                        'is_staff': False,
                        'is_superuser': False,
                    }
                )
                
                if created:
                    user.set_password('VardiyaSifre123')
                    user.save()
                    eklenen += 1
                else:
                    guncellenen += 1
            
            return Response({
                'mesaj': f'{eklenen} kullanıcı eklendi, {guncellenen} kullanıcı güncellendi.',
                'eklenen': eklenen,
                'guncellenen': guncellenen
            })
            
        except Exception as e:
            import traceback
            print("HATA:", str(e))
            print(traceback.format_exc())
            return Response(
                {'hata': f'Dosya işlenirken hata: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class ProfilGecmisiView(APIView):
    """Kullanıcının profil güncelleme geçmişi"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        talepler = ProfilGuncellemeTalebi.objects.filter(
            calisan=request.user
        ).order_by('-olusturma_tarihi')
        
        data = [{
            'id': t.id,
            'durum': t.durum,
            'yeni_telefon': t.yeni_telefon,
            'yeni_adres': t.yeni_adres,
            'profil_resmi_var': bool(t.yeni_profil_resmi),
            'olusturma_tarihi': t.olusturma_tarihi,
            'karar_tarihi': t.karar_tarihi
        } for t in talepler]
        
        return Response(data)