// frontend/src/pages/ProfilPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, Box, Avatar, Grid, TextField, Button, 
    Alert, Chip, Divider, Card, CardContent, IconButton, Badge
} from '@mui/material';
import { Edit, PhotoCamera, CheckCircle, Pending } from '@mui/icons-material';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

function ProfilPage() {
    const [user, setUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editedData, setEditedData] = useState({});
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = () => {
        setLoading(true);
        axios.get('http://127.0.0.1:8000/api/kullanicilar/profil/', getAuthHeaders())
            .then(response => {
                setUser(response.data);
                setEditedData({
                    telefon: response.data.telefon || '',
                    adres: response.data.adres || ''
                });
            })
            .catch(err => {
                console.error("Profil yüklenirken hata:", err);
                setError("Profil bilgileri yüklenemedi.");
            })
            .finally(() => setLoading(false));
    };

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const formData = new FormData();
        if (editedData.telefon !== user.telefon) {
            formData.append('telefon', editedData.telefon);
        }
        if (editedData.adres !== user.adres) {
            formData.append('adres', editedData.adres);
        }
        if (selectedImage) {
            formData.append('profil_resmi', selectedImage);
        }

        // En az bir değişiklik var mı kontrol et
        if (!formData.has('telefon') && !formData.has('adres') && !formData.has('profil_resmi')) {
            setError("Hiçbir değişiklik yapılmadı.");
            return;
        }

        axios.post('http://127.0.0.1:8000/api/kullanicilar/profil/', formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'multipart/form-data'
            }
        })
        .then(response => {
            setSuccess(response.data.mesaj);
            setEditMode(false);
            setSelectedImage(null);
            setImagePreview(null);
            fetchUserProfile(); // Profili yenile
            
            // LocalStorage'daki kullanıcıyı güncelle (admin ise)
            if (user.is_staff) {
                const updatedUser = { ...user, telefon: editedData.telefon, adres: editedData.adres };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
        })
        .catch(err => {
            console.error("Güncelleme hatası:", err);
            setError(err.response?.data?.hata || "Güncelleme talebi gönderilemedi.");
        });
    };

    if (loading) {
        return (
            <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Typography>Yükleniyor...</Typography>
            </Container>
        );
    }

    if (!user) return null;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight="bold">Profilim</Typography>
                    {!editMode && (
                        <Button 
                            variant="contained" 
                            startIcon={<Edit />}
                            onClick={() => setEditMode(true)}
                        >
                            Düzenle
                        </Button>
                    )}
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Grid container spacing={3}>
                    {/* Sol Taraf - Profil Resmi ve Temel Bilgiler */}
                    <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={
                                    editMode ? (
                                        <IconButton 
                                            component="label"
                                            sx={{ 
                                                bgcolor: 'primary.main', 
                                                color: 'white',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                        >
                                            <PhotoCamera />
                                            <input 
                                                hidden 
                                                accept="image/*" 
                                                type="file" 
                                                onChange={handleImageChange}
                                            />
                                        </IconButton>
                                    ) : null
                                }
                            >
                                <Avatar
                                    src={imagePreview || user.profil_resmi || undefined}
                                    sx={{ 
                                        width: 150, 
                                        height: 150, 
                                        mb: 2,
                                        border: '4px solid',
                                        borderColor: 'primary.main'
                                    }}
                                >
                                    {!user.profil_resmi && !imagePreview && 
                                        `${user.first_name?.[0]}${user.last_name?.[0]}`
                                    }
                                </Avatar>
                            </Badge>

                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {user.first_name} {user.last_name}
                            </Typography>
                            
                            <Chip 
                                label={user.rol === 'admin' ? 'Yönetici' : 'Çalışan'}
                                color={user.rol === 'admin' ? 'error' : 'primary'}
                                sx={{ mb: 2 }}
                            />

                            <Typography variant="body2" color="text.secondary">
                                @{user.username}
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Sağ Taraf - Detaylı Bilgiler */}
                    <Grid item xs={12} md={8}>
                        <Box component="form" onSubmit={handleSubmit}>
                            <Card variant="outlined" sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        İletişim Bilgileri
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    
                                    <TextField
                                        fullWidth
                                        label="E-posta"
                                        value={user.email}
                                        disabled
                                        sx={{ mb: 2 }}
                                        helperText="E-posta değiştirilemez"
                                    />

                                    <TextField
                                        fullWidth
                                        label="Telefon"
                                        name="telefon"
                                        value={editedData.telefon}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        sx={{ mb: 2 }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Adres"
                                        name="adres"
                                        value={editedData.adres}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        multiline
                                        rows={3}
                                    />
                                </CardContent>
                            </Card>

                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Hesap Bilgileri
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">Kullanıcı Adı</Typography>
                                            <Typography variant="body1" fontWeight="bold">{user.username}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">Rol</Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {user.rol === 'admin' ? 'Yönetici' : 'Çalışan'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">Hesap Durumu</Typography>
                                            <Chip 
                                                label={user.is_active ? 'Aktif' : 'Pasif'}
                                                color={user.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {editMode && (
                                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button 
                                        variant="outlined" 
                                        onClick={() => {
                                            setEditMode(false);
                                            setEditedData({
                                                telefon: user.telefon || '',
                                                adres: user.adres || ''
                                            });
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                        }}
                                    >
                                        İptal
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        variant="contained"
                                    >
                                        Güncelleme Talebi Gönder
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        {!editMode && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Profil bilgilerinizi değiştirmek için "Düzenle" butonuna tıklayın. 
                                Değişiklikler yönetici onayından sonra aktif olacaktır.
                            </Alert>
                        )}
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
}

export default ProfilPage;