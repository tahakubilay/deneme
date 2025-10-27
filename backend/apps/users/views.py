# apps/users/views.py
from rest_framework import viewsets, permissions
from .models import CustomUser
from .serializers import CustomUserSerializer

class UserViewSet(viewsets.ModelViewSet):
    """
    Bu viewset, kullanıcılar için listeleme, oluşturma, güncelleme ve silme
    işlemlerini otomatik olarak sağlar.
    Listeleme (GET) tüm kullanıcılara açıkken, diğer işlemler (POST, PUT, DELETE)
    sadece adminlere açıktır.
    """
    queryset = CustomUser.objects.all().order_by('first_name')
    serializer_class = CustomUserSerializer

    def get_permissions(self):
        """İşleme göre yetkileri belirler."""
        if self.action == 'list':
            # Herhangi bir giriş yapmış kullanıcı listeyi görebilir
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            # Diğer tüm işlemler (create, update, delete) sadece admin yetkisi gerektirir
            self.permission_classes = [permissions.IsAdminUser]
        return super().get_permissions()