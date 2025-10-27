// src/pages/TakvimPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import SubeHaftalikPlan from '../components/SubeHaftalikPlan'; // YENİ

import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, useTheme,
    ToggleButton, ToggleButtonGroup // YENİ
} from '@mui/material';

moment.locale('tr');
const localizer = momentLocalizer(moment);
const allViews = Object.keys(Views).map((k) => Views[k]);

// --- Özel Vardiya Kutusu Bileşeni ---
const CustomEvent = ({ event }) => {
    return (
        <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
            </Typography>
            <Typography variant="caption" component="div" sx={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {event.title}
            </Typography>
        </Box>
    );
};

function TakvimPage() {
    const theme = useTheme();
    const [events, setEvents] = useState([]);
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState(Views.MONTH);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [activeView, setActiveView] = useState('calendar'); // YENİ STATE

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
        axios.get('http://127.0.0.1:8000/api/schedules/vardiyalar/', getAuthHeaders())
            .then(response => {
                const formattedEvents = response.data.map(vardiya => ({
                    id: vardiya.id,
                    title: `${vardiya.calisan_adi} @ ${vardiya.sube_adi}`,
                    start: new Date(vardiya.baslangic_zamani),
                    end: new Date(vardiya.bitis_zamani),
                    resource: vardiya
                }));
                setEvents(formattedEvents);
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

    const handleNavigate = useCallback((newDate) => setDate(newDate), [setDate]);
    const handleViewChange = useCallback((newView) => setView(newView), [setView]);

    const handlePlanOlustur = () => {
        setGenerating(true); 
        setError(''); 
        setSuccessMessage('');
        const currentMonth = moment(date).format('YYYY-MM');
        axios.post('http://127.0.0.1:8000/api/schedules/plan-olustur/', { donem: currentMonth }, getAuthHeaders())
            .then(response => {
                setSuccessMessage(response.data.mesaj || 'Plan başarıyla oluşturuldu! Takvim yenileniyor...');
                fetchVardiyalar();
            })
            .catch(error => {
                setError(error.response?.data?.hata || 'Plan oluşturulurken bir hata oluştu.');
            })
            .finally(() => { setGenerating(false); });
    };

    const handleSelectEvent = useCallback((event) => {
        console.log("Vardiya tıklandı (işlem yok): ", event.title);
    }, []);

    const eventPropGetter = useCallback((event) => {
        const isOwnShift = currentUser && event.resource?.calisan === currentUser.id;
        const style = {
            backgroundColor: isOwnShift ? theme.palette.primary.main : theme.palette.grey[500],
            color: theme.palette.getContrastText(isOwnShift ? theme.palette.primary.main : theme.palette.grey[500]),
            borderRadius: '4px',
            border: 'none',
            opacity: 0.9,
            cursor: 'default'
        };
        return { style };
    }, [currentUser, theme]);

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography component="h1" variant="h4">Vardiya Planı</Typography>
                
                <ToggleButtonGroup
                    value={activeView}
                    exclusive
                    onChange={(e, newView) => {if (newView) setActiveView(newView);}}
                    aria-label="görünüm seçimi"
                >
                    <ToggleButton value="calendar" aria-label="standart takvim">Standart Takvim</ToggleButton>
                    <ToggleButton value="branch_weekly" aria-label="şube haftalık plan">Şube Haftalık Planı</ToggleButton>
                </ToggleButtonGroup>

                {currentUser?.is_staff && (
                    <Button variant="contained" onClick={handlePlanOlustur} disabled={generating || loading}>
                        {generating ? <CircularProgress size={24} /> : `${moment(date).format('MMMM YYYY')} Planını Oluştur`}
                    </Button>
                )}
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            {activeView === 'calendar' ? (
                <>
                    <Paper sx={{ height: '75vh', p: 2 }}>
                        {loading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Yükleniyor...</Typography></Box> ) : (
                            <Calendar
                                localizer={localizer} 
                                events={events} 
                                startAccessor="start" 
                                endAccessor="end"
                                date={date} 
                                onNavigate={handleNavigate} 
                                onSelectEvent={handleSelectEvent}
                                view={view} 
                                onView={handleViewChange} 
                                views={allViews}
                                messages={{next: "İleri", previous: "Geri", today: "Bugün", month: "Ay", week: "Hafta", day: "Gün", agenda: "Ajanda"}}
                                style={{ height: '100%' }}
                                eventPropGetter={eventPropGetter}
                                components={{ event: CustomEvent }}
                            />
                        )}
                    </Paper>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 14, height: 14, backgroundColor: theme.palette.primary.main, mr: 1, borderRadius: '2px' }} />
                            <Typography variant="body2">Vardiyanız</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 14, height: 14, backgroundColor: theme.palette.grey[500], mr: 1, borderRadius: '2px' }} />
                            <Typography variant="body2">Diğer Çalışanlar</Typography>
                        </Box>
                    </Box>
                </>
            ) : (
                <SubeHaftalikPlan events={events} loading={loading} currentUser={currentUser} />
            )}

        </Container>
    );
}

export default TakvimPage;
