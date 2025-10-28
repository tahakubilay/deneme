# apps/users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, ProfilGuncellemeTalebi

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', 'email', 'first_name', 'last_name', 'rol', 'is_staff']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Ek Bilgiler', {'fields': ('rol', 'telefon', 'adres', 'profil_resmi', 'cinsiyet', 'enlem', 'boylam')}),
    )

class ProfilGuncellemeTalebiAdmin(admin.ModelAdmin):
    list_display = ['calisan', 'durum', 'olusturma_tarihi']
    list_filter = ['durum', 'olusturma_tarihi']
    search_fields = ['calisan__username', 'calisan__first_name', 'calisan__last_name']

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(ProfilGuncellemeTalebi, ProfilGuncellemeTalebiAdmin)