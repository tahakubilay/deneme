# apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

# Bir router oluşturuyoruz
router = DefaultRouter()
# UserViewSet'i router'a kaydediyoruz. Bu, /users/ ve /users/{pk}/ URL'lerini otomatik oluşturur.
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    # Router tarafından oluşturulan URL'leri projemize dahil ediyoruz.
    path('', include(router.urls)),
]