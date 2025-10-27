// src/pages/AdminOnayPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, List, ListItem, ListItemText, Button, Divider, Box, Chip, Alert, Tab, Tabs, 
    Modal, Fade, Backdrop, Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';

// Modal için stil
const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 500,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

function AdminOnayPage() {
    const [takasIstekleri, setTakasIstekleri] = useState([]);
    const [iptalIstekleri, setIptalIstekleri] = useState([]); // YENİ
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tabValue, setTabValue] = useState(0);

    // --- YENİ MODAL STATE'LERİ ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIptalIstek, setSelectedIptalIstek] = useState(null);
    const [modalStep, setModalStep] = useState('ask'); // 'ask' veya 'assign'
    const [uygunCalisanlar, setUygunCalisanlar] = useState([]);
    const [selectedCalisanId, setSelectedCalisanId] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    // ----------------------------

    const getAuthHeaders = () => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    const fetchTakasIstekleri = () => {
        axios.get('http://127.0.0.1:8000/api/schedules/admin/istekler/', getAuthHeaders())
            .then(response => setTakasIstekleri(response.data))
            .catch(error => {
                console.error("Admin takas istekleri çekilirken hata!", error);
                setError('Onay bekleyen takas istekleri yüklenemedi.');
            });
    };

    // --- YENİ: İptal isteklerini çeken fonksiyon ---
    const fetchIptalIstekleri = () => {
        axios.get('http://127.0.0.1:8000/api/schedules/admin/iptal-istekleri/', getAuthHeaders())
            .then(response => setIptalIstekleri(response.data))
            .catch(error => {
                console.error("Admin iptal istekleri çekilirken hata!", error);
                setError('Onay bekleyen iptal istekleri yüklenemedi.');
            });
    };

    useEffect(() => {
        fetchTakasIstekleri();
        fetchIptalIstekleri();
    }, []);

    const handleTakasAksiyon = (istekId, action) => {
        setError(''); setSuccess('');
        axios.post(`http://127.0.0.1:8000/api/schedules/admin/istekler/${istekId}/aksiyon/`, { action }, getAuthHeaders())
            .then(response => {
                setSuccess(response.data.mesaj);
                fetchTakasIstekleri(); // Listeyi yenile
            })
            .catch(error => {
                console.error("Takas aksiyonu gönderilirken hata!", error);
                setError(error.response?.data?.hata || 'İşlem sırasında bir hata oluştu.');
            });
    };

    // --- YENİ: Modal'ı açan fonksiyon ---
    const handleOpenModal = (istek) => {
        setSelectedIptalIstek(istek);
        setIsModalOpen(true);
        setModalStep('ask'); // İlk adıma resetle
        setUygunCalisanlar([]);
        setSelectedCalisanId('');
        setError('');
    };

    const handleCloseModal = () => setIsModalOpen(false);

    // --- YENİ: Modal içinde "Evet" butonuna basılınca ---
    const handleFindUygunCalisanlar = () => {
        setModalLoading(true);
        axios.get(`http://127.0.0.1:8000/api/schedules/vardiyalar/${selectedIptalIstek.vardiya.id}/uygun-calisanlar/`, getAuthHeaders())
            .then(response => {
                setUygunCalisanlar(response.data);
                setModalStep('assign');
            })
            .catch(error => {
                console.error("Uygun çalışanlar çekilirken hata!", error);
                setError('Uygun çalışanlar bulunamadı veya bir hata oluştu.');
            })
            .finally(() => setModalLoading(false));
    };

    // --- YENİ: İptal isteği için aksiyon alan ana fonksiyon ---
    const handleIptalAksiyon = (action, yeni_calisan_id = null) => {
        setError(''); setSuccess('');
        const payload = { action };
        if (yeni_calisan_id) {
            payload.yeni_calisan_id = yeni_calisan_id;
        }

        axios.post(`http://127.0.0.1:8000/api/schedules/admin/iptal-istekleri/${selectedIptalIstek.id}/aksiyon/`, payload, getAuthHeaders())
            .then(response => {
                setSuccess(response.data.mesaj);
                fetchIptalIstekleri(); // Listeyi yenile
                handleCloseModal();
            })
            .catch(error => {
                console.error("İptal aksiyonu gönderilirken hata!", error);
                setError(error.response?.data?.hata || 'İşlem sırasında bir hata oluştu.');
            });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography component="h1" variant="h4" gutterBottom>
                Yönetici Onay Paneli
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} aria-label="onay-tabs">
                    <Tab label={`Takas İstekleri (${takasIstekleri.length})`} />
                    <Tab label={`İptal İstekleri (${iptalIstekleri.length})`} />
                </Tabs>
            </Box>

            {/* Takas İstekleri Paneli */}
            {tabValue === 0 && (
                <Paper sx={{ p: 2, mt: 2 }}>
                    <List>
                        {takasIstekleri.length > 0 ? takasIstekleri.map((istek, index) => (
                            <React.Fragment key={istek.id}>
                                <ListItem>
                                    <ListItemText 
                                        primary={`[${istek.istek_yapan_adi}] <-> [${istek.hedef_calisan_adi}]`}
                                        secondary={`TEKLİF: ${istek.istek_yapan_adi}, ${new Date(istek.istek_yapan_vardiya_detay.baslangic_zamani).toLocaleString('tr-TR')} vardiyasını veriyor. | İSTEK: ${istek.hedef_calisan_adi}'in ${new Date(istek.hedef_vardiya_detay.baslangic_zamani).toLocaleString('tr-TR')} vardiyasını istiyor.`}
                                    />
                                    <Box sx={{ minWidth: 220 }}>
                                        <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleTakasAksiyon(istek.id, 'onayla')}>Onayla</Button>
                                        <Button variant="contained" color="error" onClick={() => handleTakasAksiyon(istek.id, 'reddet')}>Reddet</Button>
                                    </Box>
                                </ListItem>
                                {index < takasIstekleri.length - 1 && <Divider />}
                            </React.Fragment>
                        )) : <Typography>Onay bekleyen bir takas isteği yok.</Typography>}
                    </List>
                </Paper>
            )}

            {/* İptal İstekleri Paneli (YENİ) */}
            {tabValue === 1 && (
                <Paper sx={{ p: 2, mt: 2 }}>
                    <List>
                        {iptalIstekleri.length > 0 ? iptalIstekleri.map((istek, index) => (
                            <React.Fragment key={istek.id}>
                                <ListItem>
                                    <ListItemText 
                                        primary={`[${istek.istek_yapan}] vardiyasını iptal etmek istiyor.`}
                                        secondary={`Vardiya: ${new Date(istek.vardiya.baslangic_zamani).toLocaleString('tr-TR')} @ ${istek.vardiya.sube_adi}`}
                                    />
                                    <Box sx={{ minWidth: 220 }}>
                                        <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleOpenModal(istek)}>Onayla</Button>
                                        <Button variant="contained" color="error" onClick={() => handleIptalAksiyon('reddet', istek.id)}>Reddet</Button>
                                    </Box>
                                </ListItem>
                                {index < iptalIstekleri.length - 1 && <Divider />}
                            </React.Fragment>
                        )) : <Typography>Onay bekleyen bir iptal isteği yok.</Typography>}
                    </List>
                </Paper>
            )}

            {/* İptal Onay Modalı (YENİ) */}
            <Modal open={isModalOpen} onClose={handleCloseModal} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
                <Fade in={isModalOpen}>
                    <Box sx={modalStyle}>
                        {modalLoading ? <CircularProgress /> : (
                            <>
                                {modalStep === 'ask' && (
                                    <>
                                        <Typography variant="h6" component="h2">İptal İsteğini Onayla</Typography>
                                        <Typography sx={{ mt: 2 }}>Bu vardiya iptalini onaylamak üzeresiniz. İptal edilen vardiyanın yerini doldurmak için yeni bir çalışan atamak ister misiniz?</Typography>
                                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button onClick={() => handleIptalAksiyon('onayla')} sx={{ mr: 1 }}>Hayır, Sadece İptal Et</Button>
                                            <Button variant="contained" onClick={handleFindUygunCalisanlar}>Evet, Çalışan Ata</Button>
                                        </Box>
                                    </>
                                )}

                                {modalStep === 'assign' && (
                                    <>
                                        <Typography variant="h6" component="h2">Yeni Çalışan Ata</Typography>
                                        <Typography sx={{ mt: 1 }}>İptal edilen vardiya için uygun olan çalışanlar:</Typography>
                                        {uygunCalisanlar.length > 0 ? (
                                            <FormControl fullWidth sx={{ mt: 2 }}>
                                                <InputLabel id="calisan-select-label">Uygun Çalışan Seç</InputLabel>
                                                <Select
                                                    labelId="calisan-select-label"
                                                    value={selectedCalisanId}
                                                    label="Uygun Çalışan Seç"
                                                    onChange={(e) => setSelectedCalisanId(e.target.value)}
                                                >
                                                    {uygunCalisanlar.map(user => (
                                                        <MenuItem key={user.id} value={user.id}>{user.ad_soyad} ({user.username})</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        ) : <Alert severity="warning" sx={{mt: 2}}>Bu vardiya için atanabilecek uygun bir çalışan bulunamadı.</Alert>}
                                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button onClick={() => setModalStep('ask')} sx={{ mr: 1 }}>Geri</Button>
                                            <Button variant="contained" onClick={() => handleIptalAksiyon('onayla', selectedCalisanId)} disabled={!selectedCalisanId}>
                                                Onayla ve Ata
                                            </Button>
                                        </Box>
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                </Fade>
            </Modal>

        </Container>
    );
}

export default AdminOnayPage;