# apps/branches/views.py

from rest_framework import viewsets, permissions
from .models import Sube, SubeCalismaSaati
from .serializers import SubeSerializer, SubeCalismaSaatiSerializer

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
