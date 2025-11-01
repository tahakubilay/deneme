// src/pages/AdminOnayPage.js - GÜNCELLENMİŞ

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
        Container, Typography, Paper, List, ListItem, ListItemText, Button, Divider, Box, Chip, Alert, Tab
    , Tabs, 
    Modal, Fade, Backdrop, Select, MenuItem, FormControl, InputLabel, CircularProgress, Avatar, Grid,
    ListItemIcon
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CancelIcon from '@mui/icons-material/Cancel';
import personIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import moment from 'moment';



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
    const [iptalIstekleri, setIptalIstekleri] = useState([]);
    const [profilTalepleri, setProfilTalepleri] = useState([]); // YENİ
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIptalIstek, setSelectedIptalIstek] = useState(null);
    const [modalStep, setModalStep] = useState('ask');
    const [uygunCalisanlar, setUygunCalisanlar] = useState([]);
    const [selectedCalisanId, setSelectedCalisanId] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const [islemGecmisi, setIslemGecmisi] = useState([]);

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

    const fetchIptalIstekleri = () => {
        axios.get('http://127.0.0.1:8000/api/schedules/admin/iptal-istekleri/', getAuthHeaders())
            .then(response => setIptalIstekleri(response.data))
            .catch(error => {
                console.error("Admin iptal istekleri çekilirken hata!", error);
                setError('Onay bekleyen iptal istekleri yüklenemedi.');
            });
    };

    // YENİ: Profil taleplerini çek
    const fetchProfilTalepleri = () => {
        axios.get('http://127.0.0.1:8000/api/kullanicilar/admin/profil-talepleri/', getAuthHeaders())
            .then(response => setProfilTalepleri(response.data))
            .catch(error => {
                console.error("Profil talepleri çekilirken hata!", error);
                setError('Profil talepleri yüklenemedi.');
            });
    };

    const fetchIslemGecmisi = () => {
        axios.get('http://127.0.0.1:8000/api/schedules/admin/onay-gecmisi/', getAuthHeaders())
            .then(response => {
                setIslemGecmisi(response.data);
            })
            .catch(error => {
                console.error("İşlem geçmişi çekilirken hata!", error);
            });
    };

    useEffect(() => {
        fetchTakasIstekleri();
        fetchIptalIstekleri();
        fetchProfilTalepleri();
        fetchIslemGecmisi();
    }, []);

    const handleTakasAksiyon = (istekId, action) => {
        setError(''); setSuccess('');
        axios.post(`http://127.0.0.1:8000/api/schedules/admin/istekler/${istekId}/aksiyon/`, { action }, getAuthHeaders())
            .then(response => {
                setSuccess(response.data.mesaj);
                fetchTakasIstekleri();
            })
            .catch(error => {
                console.error("Takas aksiyonu gönderilirken hata!", error);
                setError(error.response?.data?.hata || 'İşlem sırasında bir hata oluştu.');
            });
    };

    const handleOpenModal = (istek) => {
        setSelectedIptalIstek(istek);
        setIsModalOpen(true);
        setModalStep('ask');
        setUygunCalisanlar([]);
        setSelectedCalisanId('');
        setError('');
    };

    const handleCloseModal = () => setIsModalOpen(false);

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

    const handleIptalAksiyon = (action, yeni_calisan_id = null) => {
        setError(''); setSuccess('');
        const payload = { action };
        if (yeni_calisan_id) {
            payload.yeni_calisan_id = yeni_calisan_id;
        }

        axios.post(`http://127.0.0.1:8000/api/schedules/admin/iptal-istekleri/${selectedIptalIstek.id}/aksiyon/`, payload, getAuthHeaders())
            .then(response => {
                setSuccess(response.data.mesaj);
                fetchIptalIstekleri();
                handleCloseModal();
            })
            .catch(error => {
                console.error("İptal aksiyonu gönderilirken hata!", error);
                setError(error.response?.data?.hata || 'İşlem sırasında bir hata oluştu.');
            });
    };

    // YENİ: Profil talebi işle
    const handleProfilAksiyon = (talepId, action) => {
        setError(''); setSuccess('');
        axios.post(`http://127.0.0.1:8000/api/kullanicilar/admin/profil-talepleri/${talepId}/`, { action }, getAuthHeaders())
            .then(response => {
                setSuccess(response.data.mesaj);
                fetchProfilTalepleri();
            })
            .catch(error => {
                console.error("Profil aksiyonu gönderilirken hata!", error);
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
                    
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label={`Takas (${takasIstekleri.length})`} />
                    <Tab label={`İptal (${iptalIstekleri.length})`} />
                    <Tab label={`Profil (${profilTalepleri.length})`} />
                    <Tab label="Geçmiş" />
                </Tabs>
            </Box>

            {/* TAB 0: Takas */}
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

            {/* TAB 1: İptal */}
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

            {/* TAB 2: Profil Talepleri (YENİ) */}
            {tabValue === 2 && (
                <Paper sx={{ p: 2, mt: 2 }}>
                    <List>
                        {profilTalepleri.length > 0 ? profilTalepleri.map((talep, index) => (
                            <React.Fragment key={talep.id}>
                                <ListItem>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item>
                                            <Avatar>{talep.calisan.charAt(0)}</Avatar>
                                        </Grid>
                                        <Grid item xs>
                                            <ListItemText 
                                                primary={talep.calisan}
                                                secondary={
                                                    <>
                                                        {talep.yeni_telefon && `Telefon: ${talep.yeni_telefon} | `}
                                                        {talep.yeni_adres && `Adres değişikliği | `}
                                                        {talep.profil_resmi_var && `Profil resmi`}
                                                    </>
                                                }
                                            />
                                        </Grid>
                                        <Grid item>
                                            <Box>
                                                <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleProfilAksiyon(talep.id, 'onayla')}>
                                                    Onayla
                                                </Button>
                                                <Button variant="contained" color="error" onClick={() => handleProfilAksiyon(talep.id, 'reddet')}>
                                                    Reddet
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </ListItem>
                                {index < profilTalepleri.length - 1 && <Divider />}
                            </React.Fragment>
                        )) : <Typography>Onay bekleyen profil talebi yok.</Typography>}
                    </List>
                </Paper>
            )}
            
            {/* TAB 3: Geçmiş */}
            {tabValue === 3 && (
                <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon /> İşlem Geçmişi (Son 50 Kayıt)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {islemGecmisi.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary">
                                Henüz işlem geçmişi bulunmamaktadır.
                            </Typography>
                        </Box>
                    ) : (
                        <List>
                            {islemGecmisi.map((islem, index) => (
                                <React.Fragment key={`${islem.tip}-${islem.id}`}>
                                    <ListItem>
                                        <ListItemIcon>
                                            {islem.tip === 'takas' ? (
                                                <SwapHorizIcon color={islem.durum === 'onaylandi' ? 'success' : 'error'} />
                                            ) : (
                                                <CancelIcon color={islem.durum === 'onaylandi' ? 'success' : 'error'} />
                                            )}
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip 
                                                        label={islem.tip === 'takas' ? 'TAKAS' : 'İPTAL'}
                                                        size="small"
                                                        color={islem.tip === 'takas' ? 'primary' : 'warning'}
                                                    />
                                                    {islem.tip === 'takas' ? (
                                                        <Typography variant="body2">
                                                            {islem.istek_yapan} ↔ {islem.hedef_calisan}
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body2">
                                                            {islem.istek_yapan} - {islem.vardiya}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {moment(islem.tarih).format('DD MMMM YYYY, HH:mm')}
                                                    </Typography>
                                                    <Chip 
                                                        label={islem.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}
                                                        size="small"
                                                        color={islem.durum === 'onaylandi' ? 'success' : 'error'}
                                                        sx={{ height: 20 }}
                                                    />
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < islemGecmisi.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Paper>
            )}

            {/* İptal Onay Modalı */}
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

