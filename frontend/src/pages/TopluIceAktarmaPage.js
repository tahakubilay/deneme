// frontend/src/pages/TopluIceAktarmaPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, Box, Button, Alert, Grid, Card, CardContent,
    List, ListItem, ListItemText, Divider, Chip, IconButton, Checkbox,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import {
    CloudUpload, Delete, People, Business, Schedule, CheckCircle, Error
} from '@mui/icons-material';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { 
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        } 
    };
};

function TopluIceAktarmaPage() {
    const [calisanlar, setCalisanlar] = useState([]);
    const [subeler, setSubeler] = useState([]);
    const [selectedCalisanlar, setSelectedCalisanlar] = useState([]);
    const [selectedSubeler, setSelectedSubeler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteType, setDeleteType] = useState(''); // 'calisan' veya 'sube'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        Promise.all([
            axios.get('http://127.0.0.1:8000/api/kullanicilar/', getAuthHeaders()),
            axios.get('http://127.0.0.1:8000/api/subeler/', getAuthHeaders())
        ]).then(([calisanRes, subeRes]) => {
            setCalisanlar(calisanRes.data.filter(u => !u.is_staff));
            setSubeler(subeRes.data);
        }).catch(err => {
            console.error("Veri yükleme hatası:", err);
            setError("Veriler yüklenemedi.");
        });
    };

    const handleFileUpload = (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('file', file);

        let endpoint = '';
        if (type === 'calisan') {
            endpoint = 'http://127.0.0.1:8000/api/kullanicilar/toplu-ice-aktar/';
        } else if (type === 'sube') {
            endpoint = 'http://127.0.0.1:8000/api/subeler/toplu-ice-aktar/';
        } else if (type === 'musaitlik') {
            // Dönem parametresi ekle
            const donem = prompt("Müsaitlik dönemi (YYYY-MM formatında, örn: 2025-11):");
            if (!donem) {
                setLoading(false);
                return;
            }
            endpoint = `http://127.0.0.1:8000/api/schedules/musaitlik/toplu-ice-aktar/?donem=${donem}`;
        }

        axios.post(endpoint, formData, getAuthHeaders())
            .then(response => {
                setSuccess(response.data.mesaj || 'İçe aktarma başarılı!');
                fetchData();
                event.target.value = ''; // Input'u temizle
            })
            .catch(err => {
                console.error("İçe aktarma hatası:", err);
                setError(err.response?.data?.hata || 'İçe aktarma başarısız oldu.');
            })
            .finally(() => setLoading(false));
    };

    
    const handleCalisanSelect = (id) => {
        setSelectedCalisanlar(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubeSelect = (id) => {
        setSelectedSubeler(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = (type) => {
        setDeleteType(type);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        setLoading(true);
        setError('');
        setSuccess('');

        const selectedIds = deleteType === 'calisan' ? selectedCalisanlar : selectedSubeler;
        const promises = selectedIds.map(id => {
            const endpoint = deleteType === 'calisan' 
                ? `http://127.0.0.1:8000/api/kullanicilar/${id}/`
                : `http://127.0.0.1:8000/api/subeler/${id}/`;
            return axios.delete(endpoint, getAuthHeaders());
        });

        Promise.all(promises)
            .then(() => {
                setSuccess(`${selectedIds.length} ${deleteType === 'calisan' ? 'çalışan' : 'şube'} başarıyla silindi.`);
                if (deleteType === 'calisan') setSelectedCalisanlar([]);
                else setSelectedSubeler([]);
                fetchData();
            })
            .catch(err => {
                console.error("Silme hatası:", err);
                setError('Silme işlemi sırasında bir hata oluştu.');
            })
            .finally(() => {
                setLoading(false);
                setDeleteDialogOpen(false);
            });
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Toplu İçe Aktarma ve Yönetim
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

            <Grid container spacing={3}>
                {/* Çalışan İçe Aktarma */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <People color="primary" sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6" fontWeight="bold">
                                    Çalışanlar
                                </Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            
                            <Button
                                fullWidth
                                variant="contained"
                                component="label"
                                startIcon={<CloudUpload />}
                                sx={{ mb: 2 }}
                            >
                                Excel'den Çalışan Ekle
                                <input
                                    hidden
                                    accept=".xlsx,.xls"
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, 'calisan')}
                                />
                            </Button>

                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                                Toplam {calisanlar.length} çalışan • {selectedCalisanlar.length} seçili
                            </Typography>

                            <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, mb: 2 }}>
                                <List dense>
                                    {calisanlar.map(calisan => (
                                        <ListItem
                                            key={calisan.id}
                                            secondaryAction={
                                                <Checkbox
                                                    edge="end"
                                                    checked={selectedCalisanlar.includes(calisan.id)}
                                                    onChange={() => handleCalisanSelect(calisan.id)}
                                                />
                                            }
                                        >
                                            <ListItemText 
                                                primary={`${calisan.first_name} ${calisan.last_name}`}
                                                secondary={calisan.username}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>

                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                disabled={selectedCalisanlar.length === 0}
                                onClick={() => handleDeleteSelected('calisan')}
                            >
                                Seçilenleri Sil ({selectedCalisanlar.length})
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Şube İçe Aktarma */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Business color="secondary" sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6" fontWeight="bold">
                                    Şubeler
                                </Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            
                            <Button
                                fullWidth
                                variant="contained"
                                component="label"
                                startIcon={<CloudUpload />}
                                sx={{ mb: 2 }}
                            >
                                Excel'den Şube Ekle
                                <input
                                    hidden
                                    accept=".xlsx,.xls"
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, 'sube')}
                                />
                            </Button>

                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                                Toplam {subeler.length} şube • {selectedSubeler.length} seçili
                            </Typography>

                            <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, mb: 2 }}>
                                <List dense>
                                    {subeler.map(sube => (
                                        <ListItem
                                            key={sube.id}
                                            secondaryAction={
                                                <Checkbox
                                                    edge="end"
                                                    checked={selectedSubeler.includes(sube.id)}
                                                    onChange={() => handleSubeSelect(sube.id)}
                                                />
                                            }
                                        >
                                            <ListItemText 
                                                primary={sube.sube_adi}
                                                secondary={sube.adres}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>

                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                disabled={selectedSubeler.length === 0}
                                onClick={() => handleDeleteSelected('sube')}
                            >
                                Seçilenleri Sil ({selectedSubeler.length})
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Müsaitlik İçe Aktarma */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Schedule color="success" sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6" fontWeight="bold">
                                    Müsaitlik
                                </Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            
                            <Button
                                fullWidth
                                variant="contained"
                                component="label"
                                startIcon={<CloudUpload />}
                                sx={{ mb: 2 }}
                            >
                                Excel'den Müsaitlik Ekle
                                <input
                                    hidden
                                    accept=".xlsx,.xls"
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, 'musaitlik')}
                                />
                            </Button>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                Müsaitlik yüklenirken dönem bilgisi (YYYY-MM) sorulacaktır.
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Silme Onay Dialogu */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Silme Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        {deleteType === 'calisan' ? selectedCalisanlar.length : selectedSubeler.length} adet{' '}
                        {deleteType === 'calisan' ? 'çalışanı' : 'şubeyi'} silmek istediğinizden emin misiniz?
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Bu işlem geri alınamaz!
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
export default TopluIceAktarmaPage;