// frontend/src/pages/VardiyaKontrolPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
    Container, Typography, Paper, Box, Button, Alert, Card, CardContent,
    Chip, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Avatar, Divider
} from '@mui/material';
import { QrCode2, CheckCircle, AccessTime, LocationOn, Business } from '@mui/icons-material';
import moment from 'moment';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

function VardiyaKontrolPage() {
    const [aktifVardiya, setAktifVardiya] = useState(null);
    const [gecmisVardiyalar, setGecmisVardiyalar] = useState([]);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerAction, setScannerAction] = useState(null); // 'baslat' veya 'bitir'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userString = localStorage.getItem('currentUser');
        if (userString) {
            try {
                setCurrentUser(JSON.parse(userString));
            } catch (e) {
                console.error("Kullanıcı bilgisi okunurken hata:", e);
            }
        }
        fetchVardiyalar();
    }, []);

    const fetchVardiyalar = () => {
        setLoading(true);
        axios.get('http://127.0.0.1:8000/api/schedules/vardiyalarim/', getAuthHeaders())
            .then(response => {
                const bugun = moment();
                const aktif = response.data.find(v => 
                    moment(v.baslangic_zamani).isSame(bugun, 'day') &&
                    ['planlandi', 'baslatildi'].includes(v.durum)
                );
                
                setAktifVardiya(aktif || null);
                
                // Son 7 günün tamamlanmış vardiyaları
                const gecmis = response.data.filter(v => 
                    v.durum === 'tamamlandi' &&
                    moment(v.baslangic_zamani).isAfter(moment().subtract(7, 'days'))
                );
                setGecmisVardiyalar(gecmis);
            })
            .catch(err => {
                console.error("Vardiyalar çekilirken hata:", err);
                setError("Vardiya bilgileri yüklenemedi.");
            })
            .finally(() => setLoading(false));
    };

    const handleQRScan = (result) => {
        if (!result || !aktifVardiya) return;

        // Scanner component'i tek bir result objesi döndürür
        const qrToken = result?.[0]?.rawValue || result?.rawValue;
        if (!qrToken) return;

        setShowScanner(false);
        setError('');
        setSuccess('');

        const payload = {
            action: scannerAction,
            qr_token: qrToken
        };

        axios.post(
            `http://127.0.0.1:8000/api/schedules/vardiyalar/${aktifVardiya.id}/kontrol/`,
            payload,
            getAuthHeaders()
        )
        .then(response => {
            setSuccess(response.data.mesaj);
            fetchVardiyalar(); // Listeyi yenile
        })
        .catch(err => {
            console.error("Vardiya kontrol hatası:", err);
            setError(err.response?.data?.hata || "İşlem başarısız oldu.");
        });
    };

    const handleScannerOpen = (action) => {
        setScannerAction(action);
        setShowScanner(true);
    };

    const hesaplaSure = (baslangic, bitis) => {
        const sure = moment.duration(moment(bitis).diff(moment(baslangic)));
        const saat = Math.floor(sure.asHours());
        const dakika = sure.minutes();
        return `${saat}s ${dakika}d`;
    };

    if (loading) {
        return (
            <Container sx={{ mt: 4 }}>
                <LinearProgress />
                <Typography align="center" sx={{ mt: 2 }}>Yükleniyor...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Vardiya Kontrol
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    QR kod okutarak vardiyalarınızı başlatın ve bitirin
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            <Grid container spacing={3}>
                {/* Aktif Vardiya Kartı */}
                <Grid item xs={12} md={6}>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            p: 3, 
                            height: '100%',
                            background: aktifVardiya 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            color: aktifVardiya ? 'white' : 'text.primary'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <AccessTime sx={{ mr: 1, fontSize: 32 }} />
                            <Typography variant="h5" fontWeight="bold">
                                {aktifVardiya ? 'Bugünün Vardiyası' : 'Aktif Vardiya Yok'}
                            </Typography>
                        </Box>

                        {aktifVardiya ? (
                            <>
                                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                                
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Business sx={{ mr: 1 }} />
                                        <Typography variant="body1">
                                            <strong>Şube:</strong> {aktifVardiya.sube_adi}
                                        </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <AccessTime sx={{ mr: 1 }} />
                                        <Typography variant="body1">
                                            <strong>Saat:</strong> {moment(aktifVardiya.baslangic_zamani).format('HH:mm')} - {moment(aktifVardiya.bitis_zamani).format('HH:mm')}
                                        </Typography>
                                    </Box>

                                    <Chip 
                                        label={aktifVardiya.durum === 'baslatildi' ? 'Devam Ediyor' : 'Başlanmadı'}
                                        color={aktifVardiya.durum === 'baslatildi' ? 'success' : 'warning'}
                                        sx={{ mt: 2 }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    {aktifVardiya.durum === 'planlandi' && (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            startIcon={<QrCode2 />}
                                            onClick={() => handleScannerOpen('baslat')}
                                            sx={{ 
                                                bgcolor: 'white', 
                                                color: 'primary.main',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                            }}
                                        >
                                            Vardiyayı Başlat
                                        </Button>
                                    )}

                                    {aktifVardiya.durum === 'baslatildi' && (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            startIcon={<CheckCircle />}
                                            onClick={() => handleScannerOpen('bitir')}
                                            sx={{ 
                                                bgcolor: 'white', 
                                                color: 'success.main',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                            }}
                                        >
                                            Vardiyayı Bitir
                                        </Button>
                                    )}
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body1">
                                    Bugün için planlanmış vardiya bulunmamaktadır.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Kullanıcı Özeti */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Profil Özeti
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        {currentUser && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                <Avatar 
                                    sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}
                                >
                                    {currentUser.first_name?.[0]}{currentUser.last_name?.[0]}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">
                                        {currentUser.first_name} {currentUser.last_name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        @{currentUser.username}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Bu Hafta
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="primary">
                                        {gecmisVardiyalar.length}
                                    </Typography>
                                    <Typography variant="caption">Tamamlanan Vardiya</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Toplam Saat
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                        {gecmisVardiyalar.reduce((total, v) => {
                                            if (v.gercek_baslangic_zamani && v.gercek_bitis_zamani) {
                                                const sure = moment(v.gercek_bitis_zamani).diff(moment(v.gercek_baslangic_zamani), 'hours', true);
                                                return total + sure;
                                            }
                                            return total;
                                        }, 0).toFixed(1)}
                                    </Typography>
                                    <Typography variant="caption">Çalışma Saati</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </Grid>

                {/* Son Vardiyalar */}
                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Son 7 Günün Vardiyaları
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        {gecmisVardiyalar.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={3}>
                                Son 7 günde tamamlanmış vardiya bulunmamaktadır.
                            </Typography>
                        ) : (
                            <Grid container spacing={2}>
                                {gecmisVardiyalar.map(vardiya => (
                                    <Grid item xs={12} sm={6} md={4} key={vardiya.id}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        {moment(vardiya.baslangic_zamani).format('DD MMM YYYY')}
                                                    </Typography>
                                                    <Chip label="Tamamlandı" size="small" color="success" />
                                                </Box>
                                                
                                                <Typography variant="body1" fontWeight="bold" gutterBottom>
                                                    {vardiya.sube_adi}
                                                </Typography>
                                                
                                                <Typography variant="body2" color="text.secondary">
                                                    {moment(vardiya.gercek_baslangic_zamani).format('HH:mm')} - 
                                                    {moment(vardiya.gercek_bitis_zamani).format('HH:mm')}
                                                </Typography>
                                                
                                                <Typography variant="caption" color="primary">
                                                    Süre: {hesaplaSure(vardiya.gercek_baslangic_zamani, vardiya.gercek_bitis_zamani)}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* QR Scanner Dialog */}
            <Dialog 
                open={showScanner} 
                onClose={() => setShowScanner(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {scannerAction === 'baslat' ? 'Vardiyayı Başlat' : 'Vardiyayı Bitir'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Lütfen şubenin QR kodunu okutun
                    </Typography>
                    
                    <Box sx={{ 
                        width: '100%', 
                        maxWidth: 400, 
                        mx: 'auto',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        overflow: 'hidden'
                    }}>
                        <Scanner
                            onScan={handleQRScan}
                            onError={(error) => console.error(error)}
                            constraints={{
                                facingMode: 'environment'
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowScanner(false)}>İptal</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default VardiyaKontrolPage;
