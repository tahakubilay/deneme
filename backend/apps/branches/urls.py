# apps/branches/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubeViewSet, SubeCalismaSaatiViewSet

router = DefaultRouter()
router.register(r'calisma-saatleri', SubeCalismaSaatiViewSet, basename='sube-calisma-saati')
router.register(r'', SubeViewSet, basename='sube')

urlpatterns = [
    path('', include(router.urls)),
]
