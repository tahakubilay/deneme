// src/pages/UserListPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- MUI Bileşenlerini ve İkonları Import Ediyoruz ---
import {
    Container, Typography, Box, Alert, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    Modal, Fade, Backdrop, TextField, Button, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// ----------------------------------------------------

// Modal için stil objesi
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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    // --- DÜZENLEME MODALI STATE'LERİ ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editedData, setEditedData] = useState({});
    // -------------------------------------

    const getAuthHeaders = () => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

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

    useEffect(() => {
        const userString = localStorage.getItem('currentUser');
        if (userString) {
            try {
                setCurrentUser(JSON.parse(userString));
            } catch (e) { console.error("Kullanıcı bilgisi okunurken hata:", e); }
        }
        fetchKullanicilar();
    }, []);

    // --- SİLME FONKSİYONU ---
    const handleDelete = (userId) => {
        if (window.confirm("Bu kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz?")) {
            setError(''); setSuccess('');
            axios.delete(`http://127.0.0.1:8000/api/kullanicilar/${userId}/`, getAuthHeaders())
                .then(() => {
                    setSuccess("Kullanıcı başarıyla silindi.");
                    fetchKullanicilar(); // Listeyi yenile
                })
                .catch(error => {
                    console.error("Kullanıcı silinirken hata!", error);
                    setError(error.response?.data?.detail || "Kullanıcı silinirken bir hata oluştu.");
                });
        }
    };
    // ------------------------

    // --- DÜZENLEME FONKSİYONLARI ---
    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditedData({ ...user }); // Düzenlenecek veriyi state'e kopyala
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
                fetchKullanicilar(); // Listeyi yenile
            })
            .catch(error => {
                console.error("Kullanıcı güncellenirken hata!", error.response?.data);
                setError(JSON.stringify(error.response?.data) || "Güncelleme sırasında bir hata oluştu.");
            });
    };
    // -----------------------------

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography component="h1" variant="h4" gutterBottom>
                Kullanıcı Yönetimi
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
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
                                <TableCell>{user.first_name} {user.last_name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.rol}</TableCell>
                                <TableCell>{user.telefon}</TableCell>
                                {currentUser && currentUser.is_staff && (
                                    <TableCell align="right">
                                        <IconButton color="primary" onClick={() => handleEditClick(user)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => handleDelete(user.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* DÜZENLEME MODALI */}
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
                                    <InputLabel id="rol-select-label">Rol</InputLabel>
                                    <Select
                                        labelId="rol-select-label"
                                        name="rol"
                                        value={editedData.rol || ''}
                                        label="Rol"
                                        onChange={handleInputChange}
                                    >
                                        <MenuItem value="admin">Admin</MenuItem>
                                        <MenuItem value="calisan">Çalışan</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField label="Telefon" name="telefon" value={editedData.telefon || ''} onChange={handleInputChange} fullWidth />
                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button onClick={handleModalClose} sx={{ mr: 1 }}>İptal</Button>
                                    <Button variant="contained" onClick={handleSaveChanges}>Değişiklikleri Kaydet</Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Fade>
            </Modal>
        </Container>
    );
}

export default UserListPage;