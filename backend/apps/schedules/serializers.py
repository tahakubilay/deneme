# apps/schedules/serializers.py
from rest_framework import serializers
from .models import Musaitlik, Vardiya, VardiyaIstegi, VardiyaIptalIstegi, CalisanTercihi, KisitlamaKurali
from .choices import Gunler, KuralSart

class MusaitlikSerializer(serializers.ModelSerializer):
    class Meta:
        model = Musaitlik
        fields = ['gun', 'musaitlik_durumu']

class CalisanTercihiSerializer(serializers.ModelSerializer):
    calisan_adi = serializers.CharField(source='calisan.get_full_name', read_only=True)
    sube_adi = serializers.CharField(source='sube.sube_adi', read_only=True)
    gun_adi = serializers.CharField(source='get_gun_display', read_only=True)

    class Meta:
        model = CalisanTercihi
        fields = ['id', 'calisan', 'calisan_adi', 'sube', 'sube_adi', 'gun', 'gun_adi']

class KisitlamaKuraliSerializer(serializers.ModelSerializer):
    sube_adi = serializers.CharField(source='sube.sube_adi', read_only=True)
    sart_display = serializers.CharField(source='get_sart_display', read_only=True)

    class Meta:
        model = KisitlamaKurali
        fields = ['id', 'sube', 'sube_adi', 'sart', 'sart_display', 'baslangic_saati']

class VardiyaSerializer(serializers.ModelSerializer):
    calisan_adi = serializers.StringRelatedField(source='calisan')
    sube_adi = serializers.StringRelatedField(source='sube')
    iptal_istegi_id = serializers.SerializerMethodField()
    aktif_istek_durumu = serializers.SerializerMethodField()

    class Meta:
        model = Vardiya
        fields = [
            'id', 'sube', 'sube_adi', 'calisan', 'calisan_adi', 
            'baslangic_zamani', 'bitis_zamani', 'gercek_baslangic_zamani', 'gercek_bitis_zamani', 'durum', 'iptal_istegi_id', 'aktif_istek_durumu'
        ]

    def get_iptal_istegi_id(self, obj):
        if hasattr(obj, 'iptal_istegi') and obj.iptal_istegi.durum == 'admin_onayi_bekliyor':
            return obj.iptal_istegi.id
        return None

    def get_aktif_istek_durumu(self, obj):
        bekleyen_durumlar = ['hedef_onayi_bekliyor', 'admin_onayi_bekliyor']
        istek = VardiyaIstegi.objects.filter(
            istek_yapan_vardiya=obj,
            durum__in=bekleyen_durumlar
        ).first()
        if istek:
            return istek.durum
        return None

class VardiyaIstegiCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VardiyaIstegi
        fields = ['istek_yapan_vardiya', 'hedef_vardiya', 'istek_yapan', 'hedef_calisan']

class VardiyaIstegiListSerializer(serializers.ModelSerializer):
    istek_yapan_adi = serializers.StringRelatedField(source='istek_yapan', read_only=True)
    hedef_calisan_adi = serializers.StringRelatedField(source='hedef_calisan', read_only=True)
    istek_yapan_vardiya_detay = VardiyaSerializer(read_only=True, source='istek_yapan_vardiya')
    hedef_vardiya_detay = VardiyaSerializer(read_only=True, source='hedef_vardiya')
    
    class Meta:
        model = VardiyaIstegi
        fields = [
            'id',
            'istek_tipi',
            'durum',
            'olusturulma_tarihi',
            'istek_yapan',
            'hedef_calisan',
            'istek_yapan_vardiya',
            'hedef_vardiya',
            'istek_yapan_adi',
            'hedef_calisan_adi',
            'istek_yapan_vardiya_detay',
            'hedef_vardiya_detay'
        ]

class VardiyaIptalIstegiCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VardiyaIptalIstegi
        fields = ['vardiya']

class VardiyaIptalIstegiListSerializer(serializers.ModelSerializer):
    istek_yapan = serializers.StringRelatedField()
    vardiya = VardiyaSerializer(read_only=True)

    class Meta:
        model = VardiyaIptalIstegi
        fields = [
            'id',
            'istek_yapan',
            'vardiya',
            'durum',
            'olusturulma_tarihi',
        ]
