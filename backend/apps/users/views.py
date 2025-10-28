# backend/apps/users/views.py - TAMAMI

from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import CustomUser, ProfilGuncellemeTalebi
from .serializers import CustomUserSerializer

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
