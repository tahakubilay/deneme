// frontend/src/pages/TakvimPage.js - GELİŞTİRİLMİŞ VERSİYON

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import SubeHaftalikPlan from '../components/SubeHaftalikPlan';

import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, useTheme,
    ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, 
    DialogActions, Chip, Grid, Card, CardContent, Divider, IconButton, Tooltip
} from '@mui/material';
import { FileDownload, Refresh, CalendarMonth, ViewWeek, FilterList} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

moment.locale('tr');
const localizer = momentLocalizer(moment);
const allViews = Object.keys(Views).map((k) => Views[k]);

// Özel stil için EventWrapper
const CustomEventWrapper = ({ event, children }) => {
    const theme = useTheme();
    const isCompleted = event.resource?.durum === 'tamamlandi';
    const isCancelled = event.resource?.durum === 'iptal';
    
    return (
        <div style={{ 
            height: '100%',
            opacity: isCancelled ? 0.5 : 1,
            border: isCompleted ? `2px solid ${theme.palette.success.main}` : 'none',
            borderRadius: '4px'
        }}>
            {children}
        </div>
    );
};

// Özel Vardiya Kutusu
const CustomEvent = ({ event }) => {
    const statusIcons = {
        'tamamlandi': '✓',
        'iptal': '✗',
        'baslatildi': '▶',
        'planlandi': '●'
    };

    return (
        <Box sx={{ height: '100%', overflow: 'hidden', px: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                {statusIcons[event.resource?.durum] || ''} {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
            </Typography>
            <Typography variant="caption" component="div" sx={{ 
                whiteSpace: 'nowrap', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden',
                fontSize: '0.7rem'
            }}>
                {event.title}
            </Typography>
        </Box>
    );
};

// Vardiya Detay Dialog
const VardiyaDetayDialog = ({ open, onClose, vardiya }) => {
    if (!vardiya) return null;

    const getDurumChip = (durum) => {
        const durumMap = {
            'planlandi': { label: 'Planlandı', color: 'primary' },
            'baslatildi': { label: 'Başlatıldı', color: 'info' },
            'tamamlandi': { label: 'Tamamlandı', color: 'success' },
            'iptal': { label: 'İptal', color: 'error' },
            'taslak': { label: 'Taslak', color: 'default' }
        };
        const config = durumMap[durum] || durumMap.taslak;
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                Vardiya Detayları
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">{vardiya.resource.sube_adi}</Typography>
                            {getDurumChip(vardiya.resource.durum)}
                        </Box>
                        <Divider />
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Çalışan</Typography>
                        <Typography variant="body1" fontWeight="bold">{vardiya.resource.calisan_adi}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Tarih</Typography>
                        <Typography variant="body1" fontWeight="bold">
                            {moment(vardiya.start).format('DD MMMM YYYY')}
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Planlanan Saat</Typography>
                        <Typography variant="body1" fontWeight="bold">
                            {moment(vardiya.start).format('HH:mm')} - {moment(vardiya.end).format('HH:mm')}
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Süre</Typography>
                        <Typography variant="body1" fontWeight="bold">
                            {moment.duration(moment(vardiya.end).diff(moment(vardiya.start))).asHours().toFixed(1)} saat
                        </Typography>
                    </Grid>

                    {vardiya.resource.gercek_baslangic_zamani && (
                        <>
                            <Grid item xs={12}><Divider /></Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Gerçek Başlangıç</Typography>
                                <Typography variant="body1" fontWeight="bold" color="success.main">
                                    {moment(vardiya.resource.gercek_baslangic_zamani).format('HH:mm')}
                                </Typography>
                            </Grid>
                            {vardiya.resource.gercek_bitis_zamani && (
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">Gerçek Bitiş</Typography>
                                    <Typography variant="body1" fontWeight="bold" color="success.main">
                                        {moment(vardiya.resource.gercek_bitis_zamani).format('HH:mm')}
                                    </Typography>
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

function TakvimPage() {
    const theme = useTheme();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState(Views.MONTH);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [activeView, setActiveView] = useState('calendar');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    }, []);

    useEffect(() => {
        const userString = localStorage.getItem('currentUser');
        if (userString) {
            try { 
                setCurrentUser(JSON.parse(userString)); 
            } catch (e) { console.error("Kullanıcı bilgisi okunurken hata:", e); }
        }
    }, []);

    const fetchVardiyalar = useCallback(() => {
        setLoading(true); 
        setError('');
    
        // ← KRİTİK: Endpoint doğru mu kontrol et
        axios.get('http://127.0.0.1:8000/api/schedules/vardiyalar/', getAuthHeaders())
            .then(response => {
                console.log("API'den gelen vardiyalar:", response.data); // ← DEBUG için ekle
                
                const formattedEvents = response.data.map(vardiya => ({
                    id: vardiya.id,
                    title: `${vardiya.calisan_adi} @ ${vardiya.sube_adi}`,
                    start: new Date(vardiya.baslangic_zamani),
                    end: new Date(vardiya.bitis_zamani),
                    resource: vardiya
                }));
            
                console.log("Formatlı eventler:", formattedEvents); // ← DEBUG için ekle
                setEvents(formattedEvents);
                setFilteredEvents(formattedEvents);
            })
            .catch(error => { 
                console.error("Vardiya fetch error!", error); 
                setError('Vardiyalar yüklenemedi.'); 
            })
            .finally(() => { setLoading(false); });
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchVardiyalar();
    }, [fetchVardiyalar]);

    // Filtreleme
    useEffect(() => {
        if (filterStatus === 'all') {
            setFilteredEvents(events);
        } else if (filterStatus === 'mine') {
            setFilteredEvents(events.filter(e => e.resource?.calisan === currentUser?.id));
        } else {
            setFilteredEvents(events.filter(e => e.resource?.durum === filterStatus));
        }
    }, [filterStatus, events, currentUser]);

    const handleNavigate = useCallback((newDate) => setDate(newDate), [setDate]);
    const handleViewChange = useCallback((newView) => setView(newView), [setView]);

    const handlePDFExport = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const currentWeekStart = moment(date).startOf('isoWeek');
    
        // Başlık
        doc.setFontSize(16);
        doc.text('Vardiya Takvimi', 148, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(
            `${currentWeekStart.format('DD MMMM YYYY')} - ${currentWeekStart.clone().add(6, 'days').format('DD MMMM YYYY')}`,
            148, 22,
            { align: 'center' }
        );

        // Tablo verilerini hazırla
        const weekDays = Array(7).fill(null).map((_, i) => 
            currentWeekStart.clone().add(i, 'days').format('dddd\nDD.MM')
        );

        const subeler = {};
        filteredEvents.forEach(event => {
            const eventDate = moment(event.start);
            if (eventDate.isBetween(currentWeekStart, currentWeekStart.clone().add(6, 'days'), 'day', '[]')) {
                const subeId = event.resource.sube;
                const subeAdi = event.resource.sube_adi;
                const dayIndex = eventDate.isoWeekday() - 1;
            
                if (!subeler[subeId]) {
                    subeler[subeId] = { 
                        adi: subeAdi, 
                        gunler: Array(7).fill(null).map(() => []) 
                    };
                }
            
                subeler[subeId].gunler[dayIndex].push({
                    calisan: event.resource.calisan_adi,
                    baslangic: moment(event.start).format('HH:mm'),
                    bitis: moment(event.end).format('HH:mm')
                });
            }
        });

        // Tablo oluştur
        const tableData = Object.values(subeler).map(sube => {
            const row = [sube.adi];
            sube.gunler.forEach(gunVardiyalar => {
                if (gunVardiyalar.length === 0) {
                    row.push('-');
                } else {
                    const vardiyaMetni = gunVardiyalar
                        .map(v => `${v.calisan}\n${v.baslangic}-${v.bitis}`)
                        .join('\n\n');
                    row.push(vardiyaMetni);
                }
            });
            return row;
        });

    // ← KRİTİK: import edilen jspdf-autotable otomatik olarak doc'a autoTable ekliyor
    // Eğer hala çalışmazsa, package.json'da versiyon kontrolü yapın
        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                head: [['Şube', ...weekDays]],
                body: tableData,
                startY: 30,
                styles: { 
                    fontSize: 8, 
                    cellPadding: 2,
                    halign: 'center',
                    valign: 'middle'
                },
                headStyles: { 
                    fillColor: [102, 126, 234],
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { cellWidth: 40, fontStyle: 'bold', halign: 'left' }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { top: 30, left: 10, right: 10 }
            });
        } else {
            console.error('autoTable metodu bulunamadı!');
            alert('PDF oluşturulamadı. Lütfen sayfayı yenileyin.');
            return;
        }

        doc.save(`Vardiya_Takvimi_${currentWeekStart.format('YYYY-MM-DD')}.pdf`);
    };
       const handlePlanOlustur = () => { 
        setGenerating(true); 
        setError(''); 
        setSuccessMessage('');
        const currentMonth = moment(date).format('YYYY-MM');
        axios.post('http://127.0.0.1:8000/api/schedules/plan-olustur/', { donem: currentMonth }, getAuthHeaders())
            .then(response => {
                setSuccessMessage(response.data.mesaj || 'Plan başarıyla oluşturuldu!');
                fetchVardiyalar();
            })
            .catch(error => {
                setError(error.response?.data?.hata || 'Plan oluşturulurken bir hata oluştu.');
            })
            .finally(() => { setGenerating(false); });
    };

    const handleSelectEvent = useCallback((event) => {
        setSelectedEvent(event);
        setDetailDialogOpen(true);
    }, []);

    const eventPropGetter = useCallback((event) => {
        const isOwnShift = currentUser && event.resource?.calisan === currentUser.id;
        const durum = event.resource?.durum;
        
        let backgroundColor = theme.palette.grey[500];
        if (isOwnShift) backgroundColor = theme.palette.primary.main;
        if (durum === 'tamamlandi') backgroundColor = theme.palette.success.main;
        if (durum === 'iptal') backgroundColor = theme.palette.error.main;
        if (durum === 'baslatildi') backgroundColor = theme.palette.info.main;

        const style = {
            backgroundColor,
            color: theme.palette.getContrastText(backgroundColor),
            borderRadius: '4px',
            border: 'none',
            opacity: durum === 'iptal' ? 0.6 : 0.95,
            cursor: 'pointer'
        };
        return { style };
    }, [currentUser, theme]);

    // İstatistikler
    const stats = {
        toplam: filteredEvents.length,
        tamamlanan: filteredEvents.filter(e => e.resource?.durum === 'tamamlandi').length,
        planlanan: filteredEvents.filter(e => e.resource?.durum === 'planlandi').length,
        iptal: filteredEvents.filter(e => e.resource?.durum === 'iptal').length
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Vardiya Takvimi
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {moment(date).format('MMMM YYYY')} - Toplam {filteredEvents.length} vardiya
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* PDF Export Butonu */}
                    <Button
                        variant="outlined"
                        startIcon={<FileDownload />}
                        onClick={handlePDFExport}
                        color="secondary"
                    >
                        PDF İndir
                    </Button>

                    <Tooltip title="Yenile">
                        <IconButton onClick={fetchVardiyalar} color="primary">
                            <Refresh />
                        </IconButton>
                    </Tooltip>

                    <ToggleButtonGroup
                        value={activeView}
                        exclusive
                        onChange={(e, newView) => {if (newView) setActiveView(newView);}}
                        size="small"
                    >
                        <ToggleButton value="calendar">
                            <CalendarMonth sx={{ mr: 1 }} /> Takvim
                        </ToggleButton>
                        <ToggleButton value="branch_weekly">
                            <ViewWeek sx={{ mr: 1 }} /> Şube Planı
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {currentUser?.is_staff && (
                        <Button 
                            variant="contained" 
                            onClick={handlePlanOlustur} 
                            disabled={generating || loading}
                            startIcon={generating ? <CircularProgress size={20} /> : null}
                        >
                            Plan Oluştur
                        </Button>
                    )}
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}

            {/* İstatistik Kartları */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption">Toplam</Typography>
                            <Typography variant="h5" fontWeight="bold">{stats.toplam}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption">Tamamlanan</Typography>
                            <Typography variant="h5" fontWeight="bold">{stats.tamamlanan}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption">Planlanan</Typography>
                            <Typography variant="h5" fontWeight="bold">{stats.planlanan}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption">İptal</Typography>
                            <Typography variant="h5" fontWeight="bold">{stats.iptal}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filtre */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList />
                <ToggleButtonGroup
                    value={filterStatus}
                    exclusive
                    onChange={(e, newFilter) => {if (newFilter) setFilterStatus(newFilter);}}
                    size="small"
                >
                    <ToggleButton value="all">Tümü</ToggleButton>
                    {currentUser && <ToggleButton value="mine">Benimkiler</ToggleButton>}
                    <ToggleButton value="planlandi">Planlanan</ToggleButton>
                    <ToggleButton value="tamamlandi">Tamamlanan</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {activeView === 'calendar' ? (
                <>
                    <Paper sx={{ height: '70vh', p: 2 }}>
                        {loading ? ( 
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <CircularProgress />
                            </Box> 
                        ) : (
                            <Calendar
                                localizer={localizer} 
                                events={filteredEvents} 
                                startAccessor="start" 
                                endAccessor="end"
                                date={date} 
                                onNavigate={handleNavigate} 
                                onSelectEvent={handleSelectEvent}
                                view={view} 
                                onView={handleViewChange} 
                                views={allViews}
                                messages={{
                                    next: "İleri", 
                                    previous: "Geri", 
                                    today: "Bugün", 
                                    month: "Ay", 
                                    week: "Hafta", 
                                    day: "Gün"
                                }}
                                style={{ height: '100%' }}
                                eventPropGetter={eventPropGetter}
                                components={{ 
                                    event: CustomEvent,
                                    eventWrapper: CustomEventWrapper
                                }}
                            />
                        )}
                    </Paper>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 14, height: 14, backgroundColor: theme.palette.primary.main, mr: 1, borderRadius: '2px' }} />
                            <Typography variant="body2">Vardiyanız</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 14, height: 14, backgroundColor: theme.palette.success.main, mr: 1, borderRadius: '2px' }} />
                            <Typography variant="body2">Tamamlanan</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 14, height: 14, backgroundColor: theme.palette.info.main, mr: 1, borderRadius: '2px' }} />
                            <Typography variant="body2">Başlatıldı</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 14, height: 14, backgroundColor: theme.palette.error.main, mr: 1, borderRadius: '2px', opacity: 0.6 }} />
                            <Typography variant="body2">İptal</Typography>
                        </Box>
                    </Box>
                </>
            ) : (
                <SubeHaftalikPlan events={filteredEvents} loading={loading} currentUser={currentUser} />
            )}

            {/* Detay Dialog */}
            <VardiyaDetayDialog 
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                vardiya={selectedEvent}
            />
        </Container>
    );
}

export default TakvimPage;