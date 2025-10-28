// frontend/src/pages/AdminProfilOnayPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, Box, Grid, Card, CardContent,
    CardMedia, Button, Alert, Chip, Divider, Avatar, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { CheckCircle, Cancel, Person, Phone, Home, CalendarToday } from '@mui/icons-material';
import moment from 'moment';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

function AdminProfilOnayPage() {
    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedTalep, setSelectedTalep] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchTalepler();
    }, []);

    const fetchTalepler = () => {
        setLoading(true);
        axios.get('http://127.0.0.1:8000/api/kullanicilar/admin/profil-talepleri/', getAuthHeaders())
            .then(response => {
                setTalepler(response.data);
            })
            .catch(err => {
                console.error("Talepler çekilirken hata:", err);
                setError("Profil talepleri yüklenemedi.");
            })
            .finally(() => setLoading(false));
    };

    const handleAction = (talepId, action) => {
        setActionLoading(true);
        setError('');
        setSuccess('');

        axios.post(
            `http://127.0.0.1:8000/api/kullanicilar/admin/profil-talepleri/${talepId}/`,
            { action },
            getAuthHeaders()
        )
        .then(response => {
            setSuccess(response.data.mesaj);
            setDialogOpen(false);
            fetchTalepler(); // Listeyi yenile
        })
        .catch(err => {
            console.error("İşlem hatası:", err);
            setError(err.response?.data?.hata || "İşlem başarısız oldu.");
        })
        .finally(() => setActionLoading(false));
    };

    const openDetailDialog = (talep) => {
        setSelectedTalep(talep);
        setDialogOpen(true);
    };

    if (loading) {
        return (
            <Container sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress size={60} />
                <Typography sx={{ mt: 2 }}>Talepler yükleniyor...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Profil Güncelleme Talepleri
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Çalışanların profil güncelleme taleplerini onaylayın veya reddedin
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            {talepler.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        Bekleyen profil güncelleme talebi bulunmamaktadır.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {talepler.map(talep => (
                        <Grid item xs={12} md={6} key={talep.id}>
                            <Card elevation={3} sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
                                                {talep.calisan?.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {talep.calisan}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    <CalendarToday sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                                    {moment(talep.olusturma_tarihi).format('DD MMM YYYY, HH:mm')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip label="Beklemede" color="warning" size="small" />
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Grid container spacing={2}>
                                        {talep.yeni_telefon && (
                                            <Grid item xs={12}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Phone color="primary" fontSize="small" />
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">Yeni Telefon</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{talep.yeni_telefon}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        )}

                                        {talep.yeni_adres && (
                                            <Grid item xs={12}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                    <Home color="primary" fontSize="small" />
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">Yeni Adres</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{talep.yeni_adres}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        )}

                                        {talep.profil_resmi_var && (
                                            <Grid item xs={12}>
                                                <Chip 
                                                    icon={<Person />} 
                                                    label="Yeni profil resmi var" 
                                                    color="info" 
                                                    size="small"
                                                />
                                            </Grid>
                                        )}
                                    </Grid>

                                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            color="success"
                                            startIcon={<CheckCircle />}
                                            onClick={() => openDetailDialog(talep)}
                                        >
                                            İncele ve Onayla
                                        </Button>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="error"
                                            startIcon={<Cancel />}
                                            onClick={() => handleAction(talep.id, 'reddet')}
                                        >
                                            Reddet
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Detay Dialog */}
            <Dialog 
                open={dialogOpen} 
                onClose={() => !actionLoading && setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedTalep && (
                    <>
                        <DialogTitle>
                            Profil Güncelleme Talebi - {selectedTalep.calisan}
                        </DialogTitle>
                        <DialogContent>
                            <Box sx={{ py: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Talep Tarihi
                                </Typography>
                                <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                                    {moment(selectedTalep.olusturma_tarihi).format('DD MMMM YYYY, HH:mm')}
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                {selectedTalep.yeni_telefon && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Yeni Telefon Numarası
                                        </Typography>
                                        <Typography variant="h6" color="primary">
                                            {selectedTalep.yeni_telefon}
                                        </Typography>
                                    </Box>
                                )}

                                {selectedTalep.yeni_adres && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Yeni Adres
                                        </Typography>
                                        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                                            <Typography variant="body1">
                                                {selectedTalep.yeni_adres}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                )}

                                {selectedTalep.profil_resmi_var && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Profil Resmi
                                        </Typography>
                                        <Alert severity="info">
                                            Çalışan yeni bir profil resmi yükledi. Onaylandığında otomatik olarak uygulanacaktır.
                                        </Alert>
                                    </Box>
                                )}

                                <Alert severity="warning" sx={{ mt: 3 }}>
                                    <Typography variant="body2">
                                        Bu talebi onayladığınızda, değişiklikler anında çalışanın profiline uygulanacaktır.
                                    </Typography>
                                </Alert>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button 
                                onClick={() => setDialogOpen(false)}
                                disabled={actionLoading}
                            >
                                İptal
                            </Button>
                            <Button 
                                variant="outlined" 
                                color="error"
                                startIcon={<Cancel />}
                                onClick={() => handleAction(selectedTalep.id, 'reddet')}
                                disabled={actionLoading}
                            >
                                Reddet
                            </Button>
                            <Button 
                                variant="contained" 
                                color="success"
                                startIcon={actionLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                                onClick={() => handleAction(selectedTalep.id, 'onayla')}
                                disabled={actionLoading}
                            >
                                Onayla
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
}

export default AdminProfilOnayPage;
