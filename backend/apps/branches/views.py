# apps/branches/views.py

from rest_framework.parsers import MultiPartParser
import pandas as pd
from rest_framework import status, viewsets, permissions
from .models import Sube, SubeCalismaSaati
from .serializers import SubeSerializer, SubeCalismaSaatiSerializer
import pandas as pd
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response



class SubeViewSet(viewsets.ModelViewSet):
    """Şubeleri yönetmek için ViewSet."""
    queryset = Sube.objects.all()
    serializer_class = SubeSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            self.permission_classes = [permissions.IsAdminUser]
        return super().get_permissions()

class SubeCalismaSaatiViewSet(viewsets.ModelViewSet):
    """Şube çalışma saatlerini yönetmek için ViewSet."""
    queryset = SubeCalismaSaati.objects.all()
    serializer_class = SubeCalismaSaatiSerializer
    permission_classes = [permissions.IsAdminUser]

class TopluSubeIceAktarView(APIView):
    """Excel'den toplu şube içe aktarma"""
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser]
    
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'hata': 'Dosya bulunamadı.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import Sube, SubeCalismaSaati
            
            # Excel'i oku
            df = pd.read_excel(file)
            df = df.where(pd.notnull(df), None)
            
            gun_map = {
                'pzt': 1, 'sali': 2, 'cars': 3, 'pers': 4,
                'cuma': 5, 'cmt': 6, 'pzr': 7
            }
            
            eklenen = 0
            guncellenen = 0
            
            for index, row in df.iterrows():
                if pd.isna(row.get('sube_adi')):
                    continue
                
                sube, created = Sube.objects.update_or_create(
                    sube_adi=row['sube_adi'],
                    defaults={
                        'adres': row.get('adres', ''),
                        'enlem': row.get('enlem'),
                        'boylam': row.get('boylam')
                    }
                )
                
                if created:
                    eklenen += 1
                else:
                    guncellenen += 1
                
                # Çalışma saatlerini ekle
                for prefix, gun_numarasi in gun_map.items():
                    acilis_col = f'{prefix}_acilis'
                    kapanis_col = f'{prefix}_kapanis'
                    
                    acilis = row.get(acilis_col)
                    kapanis = row.get(kapanis_col)
                    
                    if acilis is None or kapanis is None:
                        SubeCalismaSaati.objects.update_or_create(
                            sube=sube, gun=gun_numarasi,
                            defaults={'kapali': True, 'acilis_saati': None, 'kapanis_saati': None}
                        )
                    else:
                        SubeCalismaSaati.objects.update_or_create(
                            sube=sube, gun=gun_numarasi,
                            defaults={'kapali': False, 'acilis_saati': acilis, 'kapanis_saati': kapanis}
                        )
            
            return Response({
                'mesaj': f'{eklenen} şube eklendi, {guncellenen} şube güncellendi.',
                'eklenen': eklenen,
                'guncellenen': guncellenen
            })
            
        except Exception as e:
            return Response(
                {'hata': f'Dosya işlenirken hata: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )