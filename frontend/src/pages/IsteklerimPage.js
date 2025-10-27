// src/pages/IsteklerimPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Typography, Paper, List, ListItem, ListItemText, Button, Divider, Box, Chip, Alert, ListItemIcon } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CancelIcon from '@mui/icons-material/Cancel';
import moment from 'moment';

// --- Yardımcı Fonksiyonlar ---
const getStatusChipProps = (status) => {
    switch (status) {
        case 'onaylandi':
            return { color: 'success', label: 'Onaylandı' };
        case 'reddedildi':
            return { color: 'error', label: 'Reddedildi' };
        case 'hedef_onayi_bekliyor':
            return { color: 'warning', label: 'Hedef Onayı Bekliyor' };
        case 'admin_onayi_bekliyor':
            return { color: 'warning', label: 'Admin Onayı Bekliyor' };
        default:
            return { color: 'default', label: status };
    }
};

function IsteklerimPage() {
    const [gelenIstekler, setGelenIstekler] = useState([]);
    const [gidenTakasIstekleri, setGidenTakasIstekleri] = useState([]);
    const [gidenIptalIstekleri, setGidenIptalIstekleri] = useState([]);
    const [kullanici, setKullanici] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

        // Takas isteklerini çek
        axios.get('http://127.0.0.1:8000/api/schedules/istekler/', authHeaders)
            .then(response => {
                const gelen = response.data.filter(istek => istek.hedef_calisan === kullanici.id && istek.durum === 'hedef_onayi_bekliyor');
                const giden = response.data.filter(istek => istek.istek_yapan === kullanici.id);
                setGelenIstekler(gelen);
                setGidenTakasIstekleri(giden);
            })
            .catch(error => {
                console.error("Takas istekleri çekilirken hata!", error);
                setError("Takas istekleri yüklenirken bir hata oluştu.");
            });

        // İptal isteklerini çek
        axios.get('http://127.0.0.1:8000/api/schedules/iptal-isteklerim/', authHeaders)
            .then(response => {
                setGidenIptalIstekleri(response.data);
            })
            .catch(error => {
                console.error("İptal istekleri çekilirken hata!", error);
                setError("İptal istekleri yüklenirken bir hata oluştu.");
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
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography component="h1" variant="h4" gutterBottom>
                İsteklerim
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Paper sx={{ p: 2, mb: 3 }}>
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
                                <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleYanit(istek.id, 'onayla')}>Onayla</Button>
                                <Button variant="contained" color="error" onClick={() => handleYanit(istek.id, 'reddet')}>Reddet</Button>
                            </Box>
                        </ListItem>
                    )) : <Typography sx={{p: 2}}>Size gelen bir takas isteği yok.</Typography>}
                </List>
            </Paper>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Gönderdiğim Takas İstekleri</Typography>
                <List>
                    {gidenTakasIstekleri.length > 0 ? gidenTakasIstekleri.map((istek, index) => (
                        <ListItem key={istek.id} divider={index < gidenTakasIstekleri.length - 1}>
                            <ListItemIcon><SwapHorizIcon sx={{color: 'orange'}} /></ListItemIcon>
                            <ListItemText 
                                primary={`${istek.hedef_calisan_adi}'in ${moment(istek.hedef_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyası için teklif.`}
                                secondary={`Karşılığında: Sizin ${moment(istek.istek_yapan_vardiya_detay.baslangic_zamani).format('DD.MM HH:mm')} vardiyanız.`}
                            />
                            {['hedef_onayi_bekliyor', 'admin_onayi_bekliyor'].includes(istek.durum) ? (
                                <Button variant="outlined" color="warning" onClick={() => handleTakasGeriCek(istek.id)}>Geri Çek</Button>
                            ) : (
                                <Chip {...getStatusChipProps(istek.durum)} />
                            )}
                        </ListItem>
                    )) : <Typography sx={{p: 2}}>Gönderdiğiniz bir takas isteği yok.</Typography>}
                </List>
            </Paper>

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Gönderdiğim İptal İstekleri</Typography>
                <List>
                    {gidenIptalIstekleri.length > 0 ? gidenIptalIstekleri.map((istek, index) => (
                        <ListItem key={istek.id} divider={index < gidenIptalIstekleri.length - 1}>
                            <ListItemIcon><CancelIcon color="error" /></ListItemIcon>
                            <ListItemText 
                                primary={`${moment(istek.vardiya.baslangic_zamani).format('DD.MM HH:mm')} @ ${istek.vardiya.sube_adi} vardiyası için iptal talebi.`}
                            />
                            {istek.durum === 'admin_onayi_bekliyor' ? (
                                <Button variant="outlined" color="warning" onClick={() => handleIptalGeriCek(istek.id)}>Geri Çek</Button>
                            ) : (
                                <Chip {...getStatusChipProps(istek.durum)} />
                            )}
                        </ListItem>
                    )) : <Typography sx={{p: 2}}>Gönderdiğiniz bir iptal isteği yok.</Typography>}
                </List>
            </Paper>

        </Container>
    );
}

export default IsteklerimPage;
