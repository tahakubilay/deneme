// src/pages/IsteklerimPage.js - GELİŞTİRİLMİŞ VERSİYON

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Container, Typography, Paper, List, ListItem, ListItemText, Button, Divider, 
    Box, Chip, Alert, ListItemIcon, Tabs, Tab, Card, CardContent, Grid 
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person'; // YENİ
import moment from 'moment';

const getStatusChipProps = (status) => {
    switch (status) {
        case 'onaylandi':
            return { color: 'success', label: 'Onaylandı', icon: <CheckCircleIcon /> };
        case 'reddedildi':
            return { color: 'error', label: 'Reddedildi', icon: <CancelIcon /> };
        case 'hedef_onayi_bekliyor':
            return { color: 'warning', label: 'Hedef Onayı Bekliyor', icon: <PendingIcon /> };
        case 'admin_onayi_bekliyor':
            return { color: 'info', label: 'Admin Onayı Bekliyor', icon: <PendingIcon /> };
        default:
            return { color: 'default', label: status, icon: null };
    }
};

function IsteklerimPage() {
    const [gelenIstekler, setGelenIstekler] = useState([]);
    const [gidenTakasIstekleri, setGidenTakasIstekleri] = useState([]);
    const [gidenIptalIstekleri, setGidenIptalIstekleri] = useState([]);
    const [profilTalebi, setProfilTalebi] = useState(null); // YENİ
    const [takasGecmisi, setTakasGecmisi] = useState([]);
    const [iptalGecmisi, setIptalGecmisi] = useState([]);
    const [kullanici, setKullanici] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    }, []);

    useEffect(() => {
        const userString = localStorage.getItem('currentUser');
        if (userString) {
            try {
                setKullanici(JSON.parse(userString));
            } catch (error) {
                console.error("Kullanıcı bilgisi okunurken hata:", error);
            }
        }
    }, []);

    const fetchData = useCallback(() => {
        if (!kullanici) return;

        const authHeaders = getAuthHeaders();
        setError('');
        setSuccess('');

        // Takas isteklerini çek (TÜM İSTEKLER)
        axios.get('http://127.0.0.1:8000/api/schedules/istekler/', authHeaders)
            .then(response => {
                const gelen = response.data.filter(istek => 
                    istek.hedef_calisan === kullanici.id && 
                    istek.durum === 'hedef_onayi_bekliyor'
                );
                
                const aktifGiden = response.data.filter(istek => 
                    istek.istek_yapan === kullanici.id && 
                    ['hedef_onayi_bekliyor', 'admin_onayi_bekliyor'].includes(istek.durum)
                );
                
                const gecmis = response.data.filter(istek => 
                    istek.istek_yapan === kullanici.id && 
                    ['onaylandi', 'reddedildi'].includes(istek.durum)
                );
                
                setGelenIstekler(gelen);
                setGidenTakasIstekleri(aktifGiden);
                setTakasGecmisi(gecmis);
            })
            .catch(error => {
                console.error("Takas istekleri çekilirken hata!", error);
                setError("Takas istekleri yüklenirken bir hata oluştu.");
            });

        // İptal isteklerini çek (TÜM İSTEKLER)
        axios.get('http://127.0.0.1:8000/api/schedules/iptal-isteklerim/', authHeaders)
            .then(response => {
                const aktif = response.data.filter(istek => 
                    istek.durum === 'admin_onayi_bekliyor'
                );
                
                const gecmis = response.data.filter(istek => 
                    ['onaylandi', 'reddedildi'].includes(istek.durum)
                );
                
                setGidenIptalIstekleri(aktif);
                setIptalGecmisi(gecmis);
            })
            .catch(error => {
                console.error("İptal istekleri çekilirken hata!", error);
                setError("İptal istekleri yüklenirken bir hata oluştu.");
            });

        // Profil güncelleme talebi çek (YENİ)
        axios.get('http://127.0.0.1:8000/api/kullanicilar/profil-talebi/', authHeaders)
            .then(response => {
                setProfilTalebi(response.data);
            })
            .catch(error => {
                // Talep yoksa 404 dönecek, sorun değil
                setProfilTalebi(null);
            });

    }, [kullanici, getAuthHeaders]);

    useEffect(() => {
        if (kullanici) {
            fetchData();
        }
    }, [kullanici, fetchData]);

    const handleYanit = (istekId, yanit) => {
        setError(''); setSuccess('');
        axios.post(`http://127.0.0.1:8000/api/schedules/istekler/${istekId}/yanitla/`, { yanit }, getAuthHeaders())
            .then(() => {
                setSuccess("Yanıtınız başarıyla kaydedildi.");
                fetchData();
            })
            .catch(error => setError(error.response?.data?.hata || "İşlem sırasında bir hata oluştu."));
    };

    const handleTakasGeriCek = (istekId) => {
        if (window.confirm("Bu takas isteğini geri çekmek istediğinizden emin misiniz?")) {
            setError(''); setSuccess('');
            axios.post(`http://127.0.0.1:8000/api/schedules/istekler/${istekId}/geri-cek/`, {}, getAuthHeaders())
                .then(() => {
                    setSuccess("Takas isteği başarıyla geri çekildi.");
                    fetchData();
                })
                .catch(error => setError(error.response?.data?.hata || "İşlem sırasında bir hata oluştu."));
        }
    };

    const handleIptalGeriCek = (istekId) => {
        if (window.confirm("Bu iptal isteğini geri çekmek istediğinizden emin misiniz?")) {
            setError(''); setSuccess('');
            axios.post(`http://127.0.0.1:8000/api/schedules/iptal-istekleri/${istekId}/geri-cek/`, {}, getAuthHeaders())
                .then(() => {
                    setSuccess("İptal isteği başarıyla geri çekildi.");
                    fetchData();
                })
                .catch(error => setError(error.response?.data?.hata || "İşlem sırasında bir hata oluştu."));
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography component="h1" variant="h4" fontWeight="bold" gutterBottom>
                İsteklerim ve Geçmiş
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Özet Kartları */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h4" fontWeight="bold">{gelenIstekler.length}</Typography>
                            <Typography variant="caption">Gelen İstek</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h4" fontWeight="bold">
                                {gidenTakasIstekleri.length + gidenIptalIstekleri.length + (profilTalebi ? 1 : 0)}
                            </Typography>
                            <Typography variant="caption">Bekleyen İstek</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h4" fontWeight="bold">
                                {takasGecmisi.filter(i => i.durum === 'onaylandi').length + 
                                 iptalGecmisi.filter(i => i.durum === 'onaylandi').length}
                            </Typography>
                            <Typography variant="caption">Onaylanan</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h4" fontWeight="bold">
                                {takasGecmisi.filter(i => i.durum === 'reddedildi').length + 
                                 iptalGecmisi.filter(i => i.durum === 'reddedildi').length}
                            </Typography>
                            <Typography variant="caption">Reddedilen</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label={`Gelen (${gelenIstekler.length})`} />
                    <Tab label={`Bekleyen (${gidenTakasIstekleri.length + gidenIptalIstekleri.length + (profilTalebi ? 1 : 0)})`} />
                    <Tab label={`Geçmiş (${takasGecmisi.length + iptalGecmisi.length})`} />
                </Tabs>
            </Box>

            {/* TAB 0: Gelen İstekler */}
            {tabValue === 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Gelen Takas İstekleri</Typography>
                    <List>
                        {gelenIstekler.length > 0 ? gelenIstekler.map((istek, index) => (
                            <ListItem key={istek.id} divider={index < gelenIstekler.length - 1}>
                                <ListItemIcon><SwapHorizIcon color="primary" /></ListItemIcon>
                                <ListItemText 
                                    primary={`${istek.istek_yapan_adi}, sizin ${moment(istek.hedef_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyanızı istiyor.`}
                                    secondary={`Teklifi: Kendi ${moment(istek.istek_yapan_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyası.`}
                                />
                                <Box>
                                    <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleYanit(istek.id, 'onayla')}>
                                        Onayla
                                    </Button>
                                    <Button variant="contained" color="error" onClick={() => handleYanit(istek.id, 'reddet')}>
                                        Reddet
                                    </Button>
                                </Box>
                            </ListItem>
                        )) : <Typography sx={{p: 2}}>Size gelen bir takas isteği yok.</Typography>}
                    </List>
                </Paper>
            )}

            {/* TAB 1: Bekleyen İstekler */}
            {tabValue === 1 && (
                <>
                    {/* Profil Güncelleme Talebi (YENİ) */}
                    {profilTalebi && (
                        <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.lighter' }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon color="info" /> Profil Güncelleme Talebi
                            </Typography>
                            <Alert severity="info">
                                Profil güncelleme talebiniz yönetici onayı bekliyor.
                                {profilTalebi.yeni_telefon && ` Yeni Telefon: ${profilTalebi.yeni_telefon}`}
                                {profilTalebi.yeni_adres && ` | Yeni Adres güncelleniyor`}
                                {profilTalebi.profil_resmi_var && ` | Yeni profil resmi`}
                            </Alert>
                        </Paper>
                    )}

                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>Bekleyen Takas İstekleri</Typography>
                        <List>
                            {gidenTakasIstekleri.length > 0 ? gidenTakasIstekleri.map((istek, index) => (
                                <ListItem key={istek.id} divider={index < gidenTakasIstekleri.length - 1}>
                                    <ListItemIcon><SwapHorizIcon sx={{color: 'orange'}} /></ListItemIcon>
                                    <ListItemText 
                                        primary={`${istek.hedef_calisan_adi}'in ${moment(istek.hedef_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyası için teklif.`}
                                        secondary={`Karşılığında: Sizin ${moment(istek.istek_yapan_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyanız.`}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Chip {...getStatusChipProps(istek.durum)} />
                                        <Button variant="outlined" color="warning" onClick={() => handleTakasGeriCek(istek.id)}>
                                            Geri Çek
                                        </Button>
                                    </Box>
                                </ListItem>
                            )) : <Typography sx={{p: 2}}>Bekleyen takas isteğiniz yok.</Typography>}
                        </List>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Bekleyen İptal İstekleri</Typography>
                        <List>
                            {gidenIptalIstekleri.length > 0 ? gidenIptalIstekleri.map((istek, index) => (
                                <ListItem key={istek.id} divider={index < gidenIptalIstekleri.length - 1}>
                                    <ListItemIcon><CancelIcon color="error" /></ListItemIcon>
                                    <ListItemText 
                                        primary={`${moment(istek.vardiya.baslangic_zamani).format('DD.MM HH:mm')} @ ${istek.vardiya.sube_adi} vardiyası için iptal talebi.`}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Chip {...getStatusChipProps(istek.durum)} />
                                        <Button variant="outlined" color="warning" onClick={() => handleIptalGeriCek(istek.id)}>
                                            Geri Çek
                                        </Button>
                                    </Box>
                                </ListItem>
                            )) : <Typography sx={{p: 2}}>Bekleyen iptal isteğiniz yok.</Typography>}
                        </List>
                    </Paper>
                </>
            )}

            {/* TAB 2: Geçmiş */}
            {tabValue === 2 && (
                <>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HistoryIcon /> Takas Geçmişi
                        </Typography>
                        <List>
                            {takasGecmisi.length > 0 ? takasGecmisi.map((istek, index) => (
                                <ListItem key={istek.id} divider={index < takasGecmisi.length - 1}>
                                    <ListItemIcon><SwapHorizIcon color="disabled" /></ListItemIcon>
                                    <ListItemText 
                                        primary={`${istek.hedef_calisan_adi}'in ${moment(istek.hedef_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyası`}
                                        secondary={moment(istek.olusturulma_tarihi).format('DD MMMM YYYY, HH:mm')}
                                    />
                                    <Chip {...getStatusChipProps(istek.durum)} />
                                </ListItem>
                            )) : <Typography sx={{p: 2}}>Takas geçmişiniz bulunmuyor.</Typography>}
                        </List>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HistoryIcon /> İptal Geçmişi
                        </Typography>
                        <List>
                            {iptalGecmisi.length > 0 ? iptalGecmisi.map((istek, index) => (
                                <ListItem key={istek.id} divider={index < iptalGecmisi.length - 1}>
                                    <ListItemIcon><CancelIcon color="disabled" /></ListItemIcon>
                                    <ListItemText 
                                        primary={`${moment(istek.vardiya.baslangic_zamani).format('DD.MM HH:mm')} @ ${istek.vardiya.sube_adi}`}
                                        secondary={moment(istek.olusturma_tarihi).format('DD MMMM YYYY, HH:mm')}
                                    />
                                    <Chip {...getStatusChipProps(istek.durum)} />
                                </ListItem>
                            )) : <Typography sx={{p: 2}}>İptal geçmişiniz bulunmuyor.</Typography>}
                        </List>
                    </Paper>
                </>
            )}
        </Container>
    );
}

export default IsteklerimPage;