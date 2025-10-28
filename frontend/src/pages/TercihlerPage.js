// src/pages/TercihlerPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Container, Typography, Paper, Box, FormControl, InputLabel, Select, MenuItem, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const gunler = [
    { id: 1, ad: 'Pazartesi' }, { id: 2, ad: 'Salı' }, { id: 3, ad: 'Çarşamba' },
    { id: 4, ad: 'Perşembe' }, { id: 5, ad: 'Cuma' }, { id: 6, ad: 'Cumartesi' }, { id: 7, ad: 'Pazar' }
];

function TercihlerPage() {
    const [tercihler, setTercihler] = useState([]);
    const [kullanicilar, setKullanicilar] = useState([]);
    const [subeler, setSubeler] = useState([]);
    const [yeniTercih, setYeniTercih] = useState({ calisan: '', sube: '', gun: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    }, []);

    const fetchData = useCallback(() => {
        setLoading(true);
        const authHeaders = getAuthHeaders();
        Promise.all([
            axios.get('http://127.0.0.1:8000/api/schedules/tercihler/', authHeaders),
            axios.get('http://127.0.0.1:8000/api/kullanicilar/liste/', authHeaders),
            axios.get('http://127.0.0.1:8000/api/subeler/', authHeaders)
        ]).then(([tercihlerRes, kullanicilarRes, subelerRes]) => {
            setTercihler(tercihlerRes.data);
            setKullanicilar(kullanicilarRes.data.filter(k => !k.is_staff)); // Sadece çalışanları al
            setSubeler(subelerRes.data);
        }).catch(err => {
            console.error("Veri çekilirken hata!", err);
            setError("Sayfa verileri yüklenirken bir hata oluştu.");
        }).finally(() => {
            setLoading(false);
        });
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setYeniTercih(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!yeniTercih.calisan || !yeniTercih.sube || !yeniTercih.gun) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }

        axios.post('http://127.0.0.1:8000/api/schedules/tercihler/', yeniTercih, getAuthHeaders())
            .then(() => {
                setSuccess("Yeni tercih başarıyla eklendi.");
                setYeniTercih({ calisan: '', sube: '', gun: '' }); // Formu temizle
                fetchData(); // Listeyi yenile
            })
            .catch(err => {
                console.error("Tercih eklenirken hata!", err.response?.data);
                setError(JSON.stringify(err.response?.data) || "Tercih eklenirken bir hata oluştu.");
            });
    };

    const handleDelete = (tercihId) => {
        if (window.confirm("Bu tercihi silmek istediğinizden emin misiniz?")) {
            setError('');
            setSuccess('');
            axios.delete(`http://127.0.0.1:8000/api/schedules/tercihler/${tercihId}/`, getAuthHeaders())
                .then(() => {
                    setSuccess("Tercih başarıyla silindi.");
                    fetchData(); // Listeyi yenile
                })
                .catch(err => {
                    console.error("Tercih silinirken hata!", err.response?.data);
                    setError("Tercih silinirken bir hata oluştu.");
                });
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography component="h1" variant="h4" gutterBottom>
                Çalışan Favori Atama Yönetimi
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">Yeni Favori Ekle</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                    <FormControl fullWidth>
                        <InputLabel>Çalışan</InputLabel>
                        <Select name="calisan" value={yeniTercih.calisan} label="Çalışan" onChange={handleInputChange}>
                            {kullanicilar.map(user => (
                                <MenuItem key={user.id} value={user.id}>{user.first_name} {user.last_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Şube</InputLabel>
                        <Select name="sube" value={yeniTercih.sube} label="Şube" onChange={handleInputChange}>
                            {subeler.map(sube => (
                                <MenuItem key={sube.id} value={sube.id}>{sube.sube_adi}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Gün</InputLabel>
                        <Select name="gun" value={yeniTercih.gun} label="Gün" onChange={handleInputChange}>
                            {gunler.map(gun => (
                                <MenuItem key={gun.id} value={gun.id}>{gun.ad}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button type="submit" variant="contained" sx={{ height: '56px' }}>Ekle</Button>
                </Box>
            </Paper>

            <Typography variant="h6" gutterBottom>Mevcut Tercihler</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Çalışan</TableCell>
                            <TableCell>Favori Şube</TableCell>
                            <TableCell>Favori Gün</TableCell>
                            <TableCell align="right">İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} align="center">Yükleniyor...</TableCell></TableRow>
                        ) : tercihler.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center">Kayıtlı tercih bulunmamaktadır.</TableCell></TableRow>
                        ) : (
                            tercihler.map(tercih => (
                                <TableRow key={tercih.id}>
                                    <TableCell>{tercih.calisan_adi}</TableCell>
                                    <TableCell>{tercih.sube_adi}</TableCell>
                                    <TableCell>{tercih.gun_adi}</TableCell>
                                    <TableCell align="right">
                                        <IconButton color="error" onClick={() => handleDelete(tercih.id)}>
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

export default TercihlerPage;