// src/pages/SubeSaatleriPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Checkbox, Button, CircularProgress, Alert, FormControlLabel
} from '@mui/material';

const gunler = [
    { id: 1, ad: 'Pazartesi' }, { id: 2, ad: 'Salı' }, { id: 3, ad: 'Çarşamba' },
    { id: 4, ad: 'Perşembe' }, { id: 5, ad: 'Cuma' }, { id: 6, ad: 'Cumartesi' }, { id: 7, ad: 'Pazar' }
];

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

function SubeSaatleriPage() {
    const [subeSaatleri, setSubeSaatleri] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(() => {
        setLoading(true);
        Promise.all([
            axios.get('http://127.0.0.1:8000/api/subeler/', getAuthHeaders()),
            axios.get('http://127.0.0.1:8000/api/subeler/calisma-saatleri/', getAuthHeaders())
        ]).then(([subelerRes, saatlerRes]) => {
            const saatlerData = subelerRes.data.reduce((acc, sube) => {
                acc[sube.id] = { sube_adi: sube.sube_adi, gunler: {} };
                gunler.forEach(gun => {
                    const mevcutSaat = saatlerRes.data.find(s => s.sube === sube.id && s.gun === gun.id);
                    acc[sube.id].gunler[gun.id] = mevcutSaat || {
                        id: null, // Yeni kayıt olduğunu belirtir
                        sube: sube.id,
                        gun: gun.id,
                        acilis_saati: '--:--',
                        kapanis_saati: '--:--',
                        kapali: true
                    };
                });
                return acc;
            }, {});
            setSubeSaatleri(saatlerData);
        }).catch(err => {
            console.error("Veri çekilirken hata!", err);
            setError("Çalışma saatleri verisi yüklenemedi.");
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTimeChange = (subeId, gunId, field, value) => {
        setSubeSaatleri(prev => ({
            ...prev,
            [subeId]: {
                ...prev[subeId],
                gunler: {
                    ...prev[subeId].gunler,
                    [gunId]: { ...prev[subeId].gunler[gunId], [field]: value, kapali: false }
                }
            }
        }));
    };

    const handleKapaliToggle = (subeId, gunId) => {
        setSubeSaatleri(prev => {
            const isKapali = !prev[subeId].gunler[gunId].kapali;
            return {
                ...prev,
                [subeId]: {
                    ...prev[subeId],
                    gunler: {
                        ...prev[subeId].gunler,
                        [gunId]: { ...prev[subeId].gunler[gunId], kapali: isKapali }
                    }
                }
            };
        });
    };

    const handleSave = () => {
        setSaving(true);
        setError('');
        setSuccess('');

        const promises = [];
        Object.values(subeSaatleri).forEach(sube => {
            Object.values(sube.gunler).forEach(saat => {
                const payload = {
                    sube: saat.sube,
                    gun: saat.gun,
                    acilis_saati: saat.kapali ? null : saat.acilis_saati,
                    kapanis_saati: saat.kapali ? null : saat.kapanis_saati,
                    kapali: saat.kapali
                };

                if (saat.id) { // ID varsa, mevcut kayıttır -> PUT
                    promises.push(axios.put(`http://127.0.0.1:8000/api/subeler/calisma-saatleri/${saat.id}/`, payload, getAuthHeaders()));
                } else { // ID yoksa, yeni kayıttır -> POST
                    promises.push(axios.post('http://127.0.0.1:8000/api/subeler/calisma-saatleri/', payload, getAuthHeaders()));
                }
            });
        });

        Promise.all(promises)
            .then(() => {
                setSuccess("Tüm değişiklikler başarıyla kaydedildi.");
                fetchData(); // Veriyi tazeleyerek ID'leri al
            })
            .catch(err => {
                console.error("Kaydederken hata!", err.response?.data);
                setError("Değişiklikler kaydedilirken bir hata oluştu.");
            })
            .finally(() => setSaving(false));
    };

    if (loading) {
        return <Container sx={{mt: 4}}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography component="h1" variant="h4" gutterBottom>
                    Şube Çalışma Saatleri Yönetimi
                </Typography>
                <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
                    {saving ? <CircularProgress size={24} /> : 'Tüm Değişiklikleri Kaydet'}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Şube</TableCell>
                            {gunler.map(gun => (
                                <TableCell key={gun.id} align="center" sx={{ fontWeight: 'bold' }}>{gun.ad}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.keys(subeSaatleri).map(subeId => (
                            <TableRow key={subeId}>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                                    {subeSaatleri[subeId].sube_adi}
                                </TableCell>
                                {gunler.map(gun => {
                                    const saat = subeSaatleri[subeId].gunler[gun.id];
                                    return (
                                        <TableCell key={gun.id}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <TextField
                                                    type="time"
                                                    label="Açılış"
                                                    value={saat.kapali ? '' : saat.acilis_saati}
                                                    onChange={(e) => handleTimeChange(subeId, gun.id, 'acilis_saati', e.target.value)}
                                                    disabled={saat.kapali}
                                                    InputLabelProps={{ shrink: true }}
                                                    size="small"
                                                />
                                                <TextField
                                                    type="time"
                                                    label="Kapanış"
                                                    value={saat.kapali ? '' : saat.kapanis_saati}
                                                    onChange={(e) => handleTimeChange(subeId, gun.id, 'kapanis_saati', e.target.value)}
                                                    disabled={saat.kapali}
                                                    InputLabelProps={{ shrink: true }}
                                                    size="small"
                                                />
                                                <FormControlLabel
                                                    control={<Checkbox checked={saat.kapali} onChange={() => handleKapaliToggle(subeId, gun.id)} />}
                                                    label="Kapalı"
                                                />
                                            </Box>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
                    {saving ? <CircularProgress size={24} /> : 'Tüm Değişiklikleri Kaydet'}
                </Button>
            </Box>
        </Container>
    );
}

export default SubeSaatleriPage;