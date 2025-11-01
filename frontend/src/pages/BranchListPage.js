// frontend/src/pages/BranchListPage.js - TAMAMEN YENİ

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Button, TextField, Container, Typography, Box, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    Modal, Fade, Backdrop, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions
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

function BranchListPage() {
    const [subeler, setSubeler] = useState([]);
    const [selectedSubeler, setSelectedSubeler] = useState([]);
    const [yeniSubeAdi, setYeniSubeAdi] = useState('');
    const [yeniAdres, setYeniAdres] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    const [editingSube, setEditingSube] = useState(null);
    const [updatedAdi, setUpdatedAdi] = useState('');
    const [updatedAdres, setUpdatedAdres] = useState('');

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
        fetchSubeler();
    }, []);

    const fetchSubeler = () => {
        axios.get('http://127.0.0.1:8000/api/subeler/', getAuthHeaders())
            .then(response => setSubeler(response.data))
            .catch(error => {
                console.error("Şube verisi çekilirken hata!", error);
                setError("Şubeler yüklenemedi.");
            });
    };

    const handleSubeSelect = (subeId) => {
        setSelectedSubeler(prev => 
            prev.includes(subeId) ? prev.filter(id => id !== subeId) : [...prev, subeId]
        );
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedSubeler(subeler.map(s => s.id));
        } else {
            setSelectedSubeler([]);
        }
    };

    const handleBulkDelete = () => {
        if (selectedSubeler.length === 0) return;
        setDeleteDialogOpen(true);
    };

    const confirmBulkDelete = () => {
        setError('');
        setSuccess('');
        
        const promises = selectedSubeler.map(subeId => 
            axios.delete(`http://127.0.0.1:8000/api/subeler/${subeId}/`, getAuthHeaders())
        );

        Promise.all(promises)
            .then(() => {
                setSuccess(`${selectedSubeler.length} şube başarıyla silindi.`);
                setSelectedSubeler([]);
                fetchSubeler();
            })
            .catch(err => {
                console.error("Toplu silme hatası!", err);
                setError("Bazı şubeler silinemedi.");
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

        axios.post('http://127.0.0.1:8000/api/subeler/toplu-ice-aktar/', formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'multipart/form-data'
            }
        })
        .then(response => {
            setSuccess(response.data.mesaj || 'Toplu içe aktarma başarılı!');
            fetchSubeler();
            event.target.value = '';
        })
        .catch(err => {
            console.error("İçe aktarma hatası:", err);
            setError(err.response?.data?.hata || 'İçe aktarma başarısız oldu.');
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        const yeniSube = { sube_adi: yeniSubeAdi, adres: yeniAdres };
        axios.post('http://127.0.0.1:8000/api/subeler/', yeniSube, getAuthHeaders())
            .then(response => {
                setSubeler([...subeler, response.data]);
                setYeniSubeAdi('');
                setYeniAdres('');
                setSuccess('Şube başarıyla eklendi.');
            })
            .catch(error => {
                console.error("Şube eklenirken hata!", error);
                setError('Şube eklenirken bir hata oluştu.');
            });
    };

    const handleDelete = (subeId) => {
        if (window.confirm("Bu şubeyi silmek istediğinizden emin misiniz?")) {
            axios.delete(`http://127.0.0.1:8000/api/subeler/${subeId}/`, getAuthHeaders())
                .then(() => {
                    setSubeler(subeler.filter(sube => sube.id !== subeId));
                    setSuccess('Şube başarıyla silindi.');
                })
                .catch(error => {
                    console.error("Şube silinirken hata!", error);
                    setError('Şube silinemedi.');
                });
        }
    };

    const handleEditClick = (sube) => {
        setEditingSube(sube);
        setUpdatedAdi(sube.sube_adi);
        setUpdatedAdres(sube.adres);
    };

    const handleUpdate = (event) => {
        event.preventDefault();
        const guncelSube = { sube_adi: updatedAdi, adres: updatedAdres };
        axios.put(`http://127.0.0.1:8000/api/subeler/${editingSube.id}/`, guncelSube, getAuthHeaders())
            .then(response => {
                setSubeler(subeler.map(sube => sube.id === editingSube.id ? response.data : sube));
                setEditingSube(null);
                setSuccess('Şube başarıyla güncellendi.');
            })
            .catch(error => {
                console.error("Şube güncellenirken hata!", error);
                setError('Şube güncellenemedi.');
            });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography component="h1" variant="h4">Şube Yönetimi</Typography>

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
                            disabled={selectedSubeler.length === 0}
                            onClick={handleBulkDelete}
                        >
                            Seçilenleri Sil ({selectedSubeler.length})
                        </Button>
                    </Box>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            {currentUser && currentUser.is_staff && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6">Yeni Şube Ekle</Typography>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <TextField 
                            label="Şube Adı" 
                            value={yeniSubeAdi} 
                            onChange={e => setYeniSubeAdi(e.target.value)} 
                            required 
                            fullWidth 
                        />
                        <TextField 
                            label="Adres" 
                            value={yeniAdres} 
                            onChange={e => setYeniAdres(e.target.value)} 
                            required 
                            fullWidth 
                        />
                        <Button type="submit" variant="contained">Ekle</Button>
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
                                        indeterminate={selectedSubeler.length > 0 && selectedSubeler.length < subeler.length}
                                        checked={subeler.length > 0 && selectedSubeler.length === subeler.length}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                            )}
                            <TableCell>Şube Adı</TableCell>
                            <TableCell>Adres</TableCell>
                            {currentUser && currentUser.is_staff && (
                                <TableCell align="right">İşlemler</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {subeler.map(sube => (
                            <TableRow key={sube.id}>
                                {currentUser && currentUser.is_staff && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedSubeler.includes(sube.id)}
                                            onChange={() => handleSubeSelect(sube.id)}
                                        />
                                    </TableCell>
                                )}
                                <TableCell>{sube.sube_adi}</TableCell>
                                <TableCell>{sube.adres}</TableCell>
                                {currentUser && currentUser.is_staff && (
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleEditClick(sube)} color="primary">
                                            <Edit />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(sube.id)} color="error">
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
                open={Boolean(editingSube)}
                onClose={() => setEditingSube(null)}
                closeAfterTransition
                BackdropComponent={Backdrop}
                BackdropProps={{ timeout: 500 }}
            >
                <Fade in={Boolean(editingSube)}>
                    <Box sx={modalStyle}>
                        <Typography variant="h6" component="h2">Şubeyi Düzenle</Typography>
                        <Box component="form" onSubmit={handleUpdate} sx={{ mt: 2 }}>
                            <TextField 
                                label="Şube Adı" 
                                value={updatedAdi} 
                                onChange={e => setUpdatedAdi(e.target.value)} 
                                required 
                                fullWidth 
                                sx={{ mb: 2 }}
                            />
                            <TextField 
                                label="Adres" 
                                value={updatedAdres} 
                                onChange={e => setUpdatedAdres(e.target.value)} 
                                required 
                                fullWidth 
                            />
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={() => setEditingSube(null)} sx={{ mr: 1 }}>İptal</Button>
                                <Button type="submit" variant="contained">Kaydet</Button>
                            </Box>
                        </Box>
                    </Box>
                </Fade>
            </Modal>

            {/* Silme Onay Dialogu */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Toplu Silme Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        {selectedSubeler.length} şubeyi silmek istediğinizden emin misiniz?
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

export default BranchListPage;