// frontend/src/pages/UserListPage.js - KOMPLE YENİ

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Typography, Box, Alert, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    Modal, Fade, Backdrop, TextField, Button, Select, MenuItem, FormControl, InputLabel,
    Checkbox, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Edit, Delete, CloudUpload } from '@mui/icons-material';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

function UserListPage() {
    const [kullanicilar, setKullanicilar] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    // Tekli ekleme için state'ler
    const [yeniKullanici, setYeniKullanici] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        telefon: '',
        rol: 'calisan',
        password: 'VardiyaSifre123'
    });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editedData, setEditedData] = useState({});

    const getAuthHeaders = () => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    useEffect(() => {
        const userString = localStorage.getItem('currentUser');
        if (userString) {
            try {
                setCurrentUser(JSON.parse(userString));
            } catch (e) { console.error("Kullanıcı bilgisi okunurken hata:", e); }
        }
        fetchKullanicilar();
    }, []);

    const fetchKullanicilar = () => {
        axios.get('http://127.0.0.1:8000/api/kullanicilar/', getAuthHeaders())
        .then(response => {
            setKullanicilar(response.data);
        })
        .catch(error => {
            console.error("Kullanıcı verisi çekilirken hata!", error);
            setError("Kullanıcı listesi yüklenemedi.");
        });
    };

    const handleUserSelect = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedUsers(kullanicilar.filter(u => !u.is_staff).map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleBulkDelete = () => {
        if (selectedUsers.length === 0) return;
        setDeleteDialogOpen(true);
    };

    const confirmBulkDelete = () => {
        setError('');
        setSuccess('');
        
        const promises = selectedUsers.map(userId => 
            axios.delete(`http://127.0.0.1:8000/api/kullanicilar/${userId}/`, getAuthHeaders())
        );

        Promise.all(promises)
            .then(() => {
                setSuccess(`${selectedUsers.length} kullanıcı başarıyla silindi.`);
                setSelectedUsers([]);
                fetchKullanicilar();
            })
            .catch(err => {
                console.error("Toplu silme hatası!", err);
                setError("Bazı kullanıcılar silinemedi.");
            })
            .finally(() => {
                setDeleteDialogOpen(false);
            });
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setError('');
        setSuccess('');

        axios.post('http://127.0.0.1:8000/api/kullanicilar/toplu-ice-aktar/', formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'multipart/form-data'
            }
        })
        .then(response => {
            setSuccess(response.data.mesaj || 'Toplu içe aktarma başarılı!');
            fetchKullanicilar();
            event.target.value = '';
        })
        .catch(err => {
            console.error("İçe aktarma hatası:", err);
            setError(err.response?.data?.hata || 'İçe aktarma başarısız oldu.');
        });
    };

    // TEKLİ EKLEME
    const handleYeniKullaniciChange = (e) => {
        const { name, value } = e.target;
        setYeniKullanici(prev => ({ ...prev, [name]: value }));
    };

    const handleYeniKullaniciSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        axios.post('http://127.0.0.1:8000/api/kullanicilar/', yeniKullanici, getAuthHeaders())
            .then(response => {
                setSuccess('Yeni kullanıcı başarıyla eklendi.');
                setYeniKullanici({
                    username: '',
                    first_name: '',
                    last_name: '',
                    email: '',
                    telefon: '',
                    rol: 'calisan',
                    password: 'VardiyaSifre123'
                });
                fetchKullanicilar();
            })
            .catch(error => {
                console.error("Kullanıcı eklenirken hata!", error);
                setError(error.response?.data?.username?.[0] || 'Kullanıcı eklenirken bir hata oluştu.');
            });
    };

    const handleDelete = (userId) => {
        if (window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) {
            setError(''); setSuccess('');
            axios.delete(`http://127.0.0.1:8000/api/kullanicilar/${userId}/`, getAuthHeaders())
                .then(() => {
                    setSuccess("Kullanıcı başarıyla silindi.");
                    fetchKullanicilar();
                })
                .catch(error => {
                    console.error("Kullanıcı silinirken hata!", error);
                    setError(error.response?.data?.detail || "Kullanıcı silinirken bir hata oluştu.");
                });
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditedData({ ...user });
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = () => {
        setError(''); setSuccess('');
        axios.patch(`http://127.0.0.1:8000/api/kullanicilar/${editingUser.id}/`, editedData, getAuthHeaders())
            .then(() => {
                setSuccess("Kullanıcı bilgileri başarıyla güncellendi.");
                handleModalClose();
                fetchKullanicilar();
            })
            .catch(error => {
                console.error("Kullanıcı güncellenirken hata!", error.response?.data);
                setError(JSON.stringify(error.response?.data) || "Güncelleme sırasında bir hata oluştu.");
            });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography component="h1" variant="h4">
                    Kullanıcı Yönetimi
                </Typography>

                {currentUser && currentUser.is_staff && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            component="label"
                            startIcon={<CloudUpload />}
                            color="primary"
                        >
                            Excel'den Ekle
                            <input
                                hidden
                                accept=".xlsx,.xls"
                                type="file"
                                onChange={handleFileUpload}
                            />
                        </Button>

                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Delete />}
                            disabled={selectedUsers.length === 0}
                            onClick={handleBulkDelete}
                        >
                            Seçilenleri Sil ({selectedUsers.length})
                        </Button>
                    </Box>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            {/* TEKLİ EKLEME FORMU */}
            {currentUser && currentUser.is_staff && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Yeni Kullanıcı Ekle</Typography>
                    <Box component="form" onSubmit={handleYeniKullaniciSubmit}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
                            <TextField
                                label="Kullanıcı Adı"
                                name="username"
                                value={yeniKullanici.username}
                                onChange={handleYeniKullaniciChange}
                                required
                                size="small"
                            />
                            <TextField
                                label="Ad"
                                name="first_name"
                                value={yeniKullanici.first_name}
                                onChange={handleYeniKullaniciChange}
                                required
                                size="small"
                            />
                            <TextField
                                label="Soyad"
                                name="last_name"
                                value={yeniKullanici.last_name}
                                onChange={handleYeniKullaniciChange}
                                required
                                size="small"
                            />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
                            <TextField
                                label="E-posta"
                                name="email"
                                type="email"
                                value={yeniKullanici.email}
                                onChange={handleYeniKullaniciChange}
                                required
                                size="small"
                            />
                            <TextField
                                label="Telefon"
                                name="telefon"
                                value={yeniKullanici.telefon}
                                onChange={handleYeniKullaniciChange}
                                size="small"
                            />
                            <FormControl size="small">
                                <InputLabel>Rol</InputLabel>
                                <Select
                                    name="rol"
                                    value={yeniKullanici.rol}
                                    label="Rol"
                                    onChange={handleYeniKullaniciChange}
                                >
                                    <MenuItem value="calisan">Çalışan</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Button type="submit" variant="contained">
                            Kullanıcı Ekle
                        </Button>
                    </Box>
                </Paper>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {currentUser && currentUser.is_staff && (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < kullanicilar.filter(u => !u.is_staff).length}
                                        checked={kullanicilar.filter(u => !u.is_staff).length > 0 && selectedUsers.length === kullanicilar.filter(u => !u.is_staff).length}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                            )}
                            <TableCell>Ad Soyad</TableCell>
                            <TableCell>Kullanıcı Adı</TableCell>
                            <TableCell>E-posta</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell>Telefon</TableCell>
                            {currentUser && currentUser.is_staff && (
                                <TableCell align="right">İşlemler</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {kullanicilar.map(user => (
                            <TableRow key={user.id}>
                                {currentUser && currentUser.is_staff && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => handleUserSelect(user.id)}
                                            disabled={user.is_staff}
                                        />
                                    </TableCell>
                                )}
                                <TableCell>{user.first_name} {user.last_name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.rol}</TableCell>
                                <TableCell>{user.telefon}</TableCell>
                                {currentUser && currentUser.is_staff && (
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleEditClick(user)} color="primary">
                                            <Edit />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(user.id)} color="error">
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Düzenleme Modalı */}
            <Modal
                open={isModalOpen}
                onClose={handleModalClose}
                closeAfterTransition
                BackdropComponent={Backdrop}
                BackdropProps={{ timeout: 500 }}
            >
                <Fade in={isModalOpen}>
                    <Box sx={modalStyle}>
                        <Typography variant="h6" component="h2">Kullanıcıyı Düzenle</Typography>
                        {editingUser && (
                            <Box component="form" sx={{ mt: 2 }}>
                                <TextField label="Ad" name="first_name" value={editedData.first_name || ''} onChange={handleInputChange} fullWidth sx={{ mb: 2 }}/>
                                <TextField label="Soyad" name="last_name" value={editedData.last_name || ''} onChange={handleInputChange} fullWidth sx={{ mb: 2 }}/>
                                <TextField label="E-posta" name="email" type="email" value={editedData.email || ''} onChange={handleInputChange} fullWidth sx={{ mb: 2 }}/>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Rol</InputLabel>
                                    <Select name="rol" value={editedData.rol || ''} label="Rol" onChange={handleInputChange}>
                                        <MenuItem value="admin">Admin</MenuItem>
                                        <MenuItem value="calisan">Çalışan</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField label="Telefon" name="telefon" value={editedData.telefon || ''} onChange={handleInputChange} fullWidth />
                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button onClick={handleModalClose} sx={{ mr: 1 }}>İptal</Button>
                                    <Button variant="contained" onClick={handleSaveChanges}>Kaydet</Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Fade>
            </Modal>

            {/* Silme Onay Dialogu */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Toplu Silme Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        {selectedUsers.length} kullanıcıyı silmek istediğinizden emin misiniz?
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Bu işlem geri alınamaz!
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                    <Button onClick={confirmBulkDelete} color="error" variant="contained">
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default UserListPage;
