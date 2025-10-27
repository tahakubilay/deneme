// src/pages/KisitlamaKurallariPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, Box, FormControl, InputLabel, Select, MenuItem, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, TextField, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const kuralSartlari = [
    { value: 'cinsiyet_kadin', label: 'Cinsiyet: Kadın' },
    { value: 'cinsiyet_erkek', label: 'Cinsiyet: Erkek' },
    // Diğer kural şartları buraya eklenebilir
];

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

function KisitlamaKurallariPage() {
    const [kurallar, setKurallar] = useState([]);
    const [subeler, setSubeler] = useState([]);
    const [yeniKural, setYeniKural] = useState({ sube: '', sart: '', baslangic_saati: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(() => {
        setLoading(true);
        Promise.all([
            axios.get('http://127.0.0.1:8000/api/schedules/kurallar/', getAuthHeaders()),
            axios.get('http://127.0.0.1:8000/api/subeler/', getAuthHeaders())
        ]).then(([kurallarRes, subelerRes]) => {
            setKurallar(kurallarRes.data);
            setSubeler(subelerRes.data);
        }).catch(err => {
            console.error("Veri çekilirken hata!", err);
            setError("Kural verileri yüklenirken bir hata oluştu.");
        }).finally(() => {
            setLoading(false);
        });
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setYeniKural(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!yeniKural.sube || !yeniKural.sart || !yeniKural.baslangic_saati) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }

        axios.post('http://127.0.0.1:8000/api/schedules/kurallar/', yeniKural, getAuthHeaders())
            .then(() => {
                setSuccess("Yeni kural başarıyla eklendi.");
                setYeniKural({ sube: '', sart: '', baslangic_saati: '' }); // Formu temizle
                fetchData(); // Listeyi yenile
            })
            .catch(err => {
                console.error("Kural eklenirken hata!", err.response?.data);
                setError(JSON.stringify(err.response?.data) || "Kural eklenirken bir hata oluştu.");
            });
    };

    const handleDelete = (kuralId) => {
        if (window.confirm("Bu kuralı silmek istediğinizden emin misiniz?")) {
            setError('');
            setSuccess('');
            axios.delete(`http://127.0.0.1:8000/api/schedules/kurallar/${kuralId}/`, getAuthHeaders())
                .then(() => {
                    setSuccess("Kural başarıyla silindi.");
                    fetchData(); // Listeyi yenile
                })
                .catch(err => {
                    console.error("Kural silinirken hata!", err.response?.data);
                    setError("Kural silinirken bir hata oluştu.");
                });
        }
    };

    if (loading) {
        return <Container sx={{mt: 4}}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography component="h1" variant="h4" gutterBottom>
                Kısıtlama Kuralları Yönetimi
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">Yeni Kural Ekle</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                    <FormControl fullWidth>
                        <InputLabel>Şube</InputLabel>
                        <Select name="sube" value={yeniKural.sube} label="Şube" onChange={handleInputChange}>
                            {subeler.map(sube => (
                                <MenuItem key={sube.id} value={sube.id}>{sube.sube_adi}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Kural Şartı</InputLabel>
                        <Select name="sart" value={yeniKural.sart} label="Kural Şartı" onChange={handleInputChange}>
                            {kuralSartlari.map(sart => (
                                <MenuItem key={sart.value} value={sart.value}>{sart.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Başlangıç Saati"
                        type="time"
                        name="baslangic_saati"
                        value={yeniKural.baslangic_saati}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button type="submit" variant="contained" sx={{ height: '56px' }}>Ekle</Button>
                </Box>
            </Paper>

            <Typography variant="h6" gutterBottom>Mevcut Kısıtlama Kuralları</Typography>
            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Şube</TableCell>
                            <TableCell>Kural Şartı</TableCell>
                            <TableCell>Başlangıç Saati</TableCell>
                            <TableCell align="right">İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} align="center">Yükleniyor...</TableCell></TableRow>
                        ) : kurallar.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center">Kayıtlı kural bulunmamaktadır.</TableCell></TableRow>
                        ) : (
                            kurallar.map(kural => (
                                <TableRow key={kural.id}>
                                    <TableCell>{kural.sube_adi}</TableCell>
                                    <TableCell>{kural.sart_display}</TableCell>
                                    <TableCell>{kural.baslangic_saati}</TableCell>
                                    <TableCell align="right">
                                        <IconButton color="error" onClick={() => handleDelete(kural.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}

export default KisitlamaKurallariPage;