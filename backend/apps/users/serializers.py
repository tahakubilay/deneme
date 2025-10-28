# backend/apps/users/serializers.py - TAMAMI

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    profil_resmi_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 
            'email', 'rol', 'telefon', 'adres', 'is_staff',
            'profil_resmi', 'profil_resmi_url', 'cinsiyet',
            'enlem', 'boylam'
        ]
        
    def get_profil_resmi_url(self, obj):
        if obj.profil_resmi:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profil_resmi.url)
        return None


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login sırasında kullanıcı bilgilerini de döndüren serializer"""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Token bilgilerini al
        refresh = self.get_token(self.user)
        
        # Kullanıcı bilgilerini ekle
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'rol': self.user.rol,
            'is_staff': self.user.is_staff,
            'telefon': self.user.telefon,
        }
        
        return data
