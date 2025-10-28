// frontend/src/pages/IstatistiklerPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Typography, Paper, Box, Grid, Card, CardContent, 
    CircularProgress, Alert, Chip, Divider, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    TrendingUp, People, CalendarToday, CheckCircle, Cancel,
    SwapHoriz, Schedule, Warning
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import moment from 'moment';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function IstatistiklerPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('90'); // Son 90 gün

    useEffect(() => {
        fetchStatistics();
    }, [dateRange]);

    const fetchStatistics = () => {
        setLoading(true);
        setError('');

        const endDate = moment().format('YYYY-MM-DD');
        const startDate = moment().subtract(parseInt(dateRange), 'days').format('YYYY-MM-DD');

        axios.get('http://127.0.0.1:8000/api/schedules/admin/istatistikler/', {
            ...getAuthHeaders(),
            params: { baslangic: startDate, bitis: endDate }
        })
        .then(response => {
            setData(response.data);
        })
        .catch(err => {
            console.error("İstatistikler yüklenirken hata:", err);
            setError("İstatistikler yüklenemedi.");
        })
        .finally(() => setLoading(false));
    };

    if (loading) {
        return (
            <Container sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress size={60} />
                <Typography sx={{ mt: 2 }}>İstatistikler yükleniyor...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    if (!data) return null;

    // Grafik için veri hazırlama
    const aylikTrendData = data.aylik_trend.map(item => ({
        ay: moment(item.ay).format('MMM YYYY'),
        toplam: item.toplam,
        tamamlanan: item.tamamlanan
    }));

    const subePerformansData = data.sube_istatistik.map(item => ({
        name: item.sube__sube_adi,
        tamamlanan: item.tamamlanan,
        iptal: item.iptal
    }));

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Sistem İstatistikleri
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Vardiya yönetim sistemi performans göstergeleri
                    </Typography>
                </Box>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Tarih Aralığı</InputLabel>
                    <Select
                        value={dateRange}
                        label="Tarih Aralığı"
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <MenuItem value="30">Son 30 Gün</MenuItem>
                        <MenuItem value="60">Son 60 Gün</MenuItem>
                        <MenuItem value="90">Son 90 Gün</MenuItem>
                        <MenuItem value="180">Son 6 Ay</MenuItem>
                        <MenuItem value="365">Son 1 Yıl</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Özet Kartlar */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Toplam Vardiya
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                        {data.genel.toplam_vardiya}
                                    </Typography>
                                </Box>
                                <CalendarToday sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ 
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Tamamlanan
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                        {data.genel.tamamlanan_vardiya}
                                    </Typography>
                                    <Typography variant="caption">
                                        %{data.genel.tamamlanma_orani}
                                    </Typography>
                                </Box>
                                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ 
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Bekleyen Takas
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                        {data.bekleyen_islemler.takas}
                                    </Typography>
                                </Box>
                                <SwapHoriz sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ 
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Bekleyen İptal
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                        {data.bekleyen_islemler.iptal}
                                    </Typography>
                                </Box>
                                <Warning sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Grafikler */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Aylık Trend */}
                <Grid item xs={12} lg={8}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Aylık Vardiya Trendi
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={aylikTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="ay" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="toplam" 
                                    stroke="#8884d8" 
                                    strokeWidth={2}
                                    name="Toplam Vardiya"
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="tamamlanan" 
                                    stroke="#82ca9d" 
                                    strokeWidth={2}
                                    name="Tamamlanan"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Tamamlanma Oranı */}
                <Grid item xs={12} lg={4}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Genel Performans
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <CircularProgress 
                                    variant="determinate" 
                                    value={data.genel.tamamlanma_orani} 
                                    size={150}
                                    thickness={5}
                                />
                                <Box sx={{
                                    top: 0, left: 0, bottom: 0, right: 0,
                                    position: 'absolute',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Typography variant="h4" component="div" fontWeight="bold">
                                        {data.genel.tamamlanma_orani}%
                                    </Typography>
                                </Box>
                            </Box>
                            
                            <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
                                Vardiya Tamamlanma Oranı
                            </Typography>
                            
                            <Box sx={{ mt: 3 }}>
                                <Chip 
                                    label={`${data.genel.iptal_edilen} İptal`}
                                    color="error"
                                    sx={{ mr: 1 }}
                                />
                                <Chip 
                                    label={`${data.genel.tamamlanan_vardiya} Başarılı`}
                                    color="success"
                                />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Şube Performansı */}
                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Şube Bazlı Performans
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={subePerformansData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="tamamlanan" fill="#82ca9d" name="Tamamlanan" />
                                <Bar dataKey="iptal" fill="#ff8042" name="İptal Edilen" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* En İyi Performans Gösteren Çalışanlar */}
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    En Yüksek Performans Gösteren Çalışanlar
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Sıra</TableCell>
                                <TableCell>Çalışan</TableCell>
                                <TableCell align="center">Tamamlanan Vardiya</TableCell>
                                <TableCell align="center">Toplam Saat</TableCell>
                                <TableCell align="center">Performans</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.calisan_performans.slice(0, 10).map((calisan, index) => (
                                <TableRow key={calisan.calisan__id} hover>
                                    <TableCell>
                                        <Chip 
                                            label={index + 1} 
                                            color={index === 0 ? 'primary' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Avatar sx={{ mr: 2, bgcolor: COLORS[index % COLORS.length] }}>
                                                {calisan.calisan__first_name?.[0]}{calisan.calisan__last_name?.[0]}
                                            </Avatar>
                                            <Typography>
                                                {calisan.calisan__first_name} {calisan.calisan__last_name}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={calisan.toplam_vardiya}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography fontWeight="bold" color="success.main">
                                            {calisan.toplam_saat ? calisan.toplam_saat.toFixed(1) : '0.0'} saat
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={Math.min((calisan.toplam_saat / 200) * 100, 100)}
                                            sx={{ height: 8, borderRadius: 1 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}

export default IstatistiklerPage;