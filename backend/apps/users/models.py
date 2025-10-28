# backend/apps/users/models.py - TAMAMI

from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        CALISAN = 'calisan', 'Çalışan'

    class Gender(models.TextChoices):
        KADIN = 'kadin', 'Kadın'
        ERKEK = 'erkek', 'Erkek'

    # Standart User modelindeki email alanını zorunlu ve benzersiz yapalım
    email = models.EmailField(unique=True)
    
    # Eklediğimiz yeni alanlar
    rol = models.CharField(max_length=10, choices=Role.choices, default=Role.CALISAN, verbose_name="Kullanıcı Rolü")
    telefon = models.CharField(max_length=20, blank=True, null=True, verbose_name="Telefon Numarası")
    adres = models.TextField(blank=True, null=True, verbose_name="Adres")
    enlem = models.DecimalField(max_digits=10, decimal_places=8, blank=True, null=True, verbose_name="Enlem")
    boylam = models.DecimalField(max_digits=11, decimal_places=8, blank=True, null=True, verbose_name="Boylam")
    cinsiyet = models.CharField(max_length=10, choices=Gender.choices, blank=True, null=True, verbose_name="Cinsiyet")
    
    # Profil resmi - YENİ
    profil_resmi = models.ImageField(
        upload_to='profil_resimleri/',
        blank=True,
        null=True,
        verbose_name="Profil Resmi"
    )
    
    def __str__(self):
        full_name = self.get_full_name()
        return full_name if full_name else self.username


class ProfilGuncellemeTalebi(models.Model):
    """Çalışanların profil güncelleme talepleri"""
    DURUM_CHOICES = (
        ('beklemede', 'Beklemede'),
        ('onaylandi', 'Onaylandı'),
        ('reddedildi', 'Reddedildi'),
    )
    
    calisan = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='profil_talepleri'
    )
    yeni_telefon = models.CharField(max_length=20, blank=True, null=True)
    yeni_adres = models.TextField(blank=True, null=True)
    yeni_profil_resmi = models.ImageField(
        upload_to='profil_resimleri/', 
        blank=True, 
        null=True
    )
    durum = models.CharField(
        max_length=20, 
        choices=DURUM_CHOICES, 
        default='beklemede'
    )
    olusturma_tarihi = models.DateTimeField(auto_now_add=True)
    karar_tarihi = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-olusturma_tarihi']
        verbose_name = 'Profil Güncelleme Talebi'
        verbose_name_plural = 'Profil Güncelleme Talepleri'
    
    def __str__(self):
        return f"{self.calisan.username} - {self.get_durum_display()}"
