# apps/branches/serializers.py

from rest_framework import serializers
from .models import Sube, SubeCalismaSaati

class SubeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sube
        fields = '__all__'

class SubeCalismaSaatiSerializer(serializers.ModelSerializer):
    sube_adi = serializers.CharField(source='sube.sube_adi', read_only=True)
    gun_adi = serializers.CharField(source='get_gun_display', read_only=True)

    class Meta:
        model = SubeCalismaSaati
        fields = ['id', 'sube', 'sube_adi', 'gun', 'gun_adi', 'acilis_saati', 'kapanis_saati', 'kapali']