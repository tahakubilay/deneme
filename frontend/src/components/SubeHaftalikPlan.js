// src/components/SubeHaftalikPlan.js - GELİŞTİRİLMİŞ

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, CircularProgress, IconButton, useTheme, Chip
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { 'Authorization': `Bearer ${token}` } };
};

function SubeHaftalikPlan({ events, loading: eventsLoading, currentUser }) {
    const theme = useTheme();
    const [subeler, setSubeler] = useState([]);
    const [planData, setPlanData] = useState({});
    const [currentWeek, setCurrentWeek] = useState(moment().startOf('isoWeek'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/api/subeler/', getAuthHeaders())
            .then(response => {
                setSubeler(response.data);
            })
            .catch(error => console.error("Şubeler çekilirken hata!", error));
    }, []);

    useEffect(() => {
        if (eventsLoading || subeler.length === 0) {
            setLoading(true);
            return;
        }

        const weekStart = currentWeek.clone();
        const weekEnd = currentWeek.clone().endOf('isoWeek');

        const weeklyEvents = events.filter(event => 
            moment(event.start).isBetween(weekStart, weekEnd, undefined, '[]')
        );

        const data = subeler.reduce((acc, sube) => {
            acc[sube.id] = { 
                sube_adi: sube.sube_adi, 
                days: Array(7).fill(null).map(() => []) 
            };
            return acc;
        }, {});

        weeklyEvents.forEach(event => {
            const subeId = event.resource.sube;
            const dayIndex = moment(event.start).isoWeekday() - 1;

            if (data[subeId]) {
                data[subeId].days[dayIndex].push(event);
            }
        });
        
        Object.values(data).forEach(subeData => {
            subeData.days.forEach(dayEvents => {
                dayEvents.sort((a, b) => a.start - b.start);
            });
        });

        setPlanData(data);
        setLoading(false);

    }, [events, eventsLoading, subeler, currentWeek]);

    const handlePrevWeek = () => setCurrentWeek(currentWeek.clone().subtract(1, 'week'));
    const handleNextWeek = () => setCurrentWeek(currentWeek.clone().add(1, 'week'));

    const weekDays = Array(7).fill(null).map((_, i) => currentWeek.clone().add(i, 'days'));
    const today = moment().format('YYYY-MM-DD');

    // Vardiya durumuna göre renk
    const getVardiyaColor = (durum) => {
        switch (durum) {
            case 'tamamlandi': return theme.palette.success.light;
            case 'baslatildi': return theme.palette.info.light;
            case 'iptal': return theme.palette.error.light;
            default: return theme.palette.grey[100];
        }
    };

    return (
        <Paper 
            sx={{ 
                p: 2, 
                overflow: 'hidden',
                boxShadow: 3,
                borderRadius: 2
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2,
                pb: 2,
                borderBottom: `2px solid ${theme.palette.primary.main}`
            }}>
                <IconButton onClick={handlePrevWeek} color="primary">
                    <ArrowBackIos />
                </IconButton>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    {currentWeek.format('DD MMMM YYYY')} - {currentWeek.clone().add(6, 'days').format('DD MMMM YYYY')}
                </Typography>
                <IconButton onClick={handleNextWeek} color="primary">
                    <ArrowForwardIos />
                </IconButton>
            </Box>

            {(loading || eventsLoading) ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer sx={{ maxHeight: '75vh' }}>
                    <Table 
                        stickyHeader 
                        sx={{ 
                            borderCollapse: 'separate', 
                            borderSpacing: '0',
                            '& .MuiTableCell-root': {
                                border: `1px solid ${theme.palette.divider}`
                            }
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold', 
                                        width: '15%', 
                                        bgcolor: theme.palette.primary.main,
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Şube
                                </TableCell>
                                {weekDays.map(day => {
                                    const isToday = day.format('YYYY-MM-DD') === today;
                                    return (
                                        <TableCell 
                                            key={day.format('YYYY-MM-DD')} 
                                            align="center" 
                                            sx={{
                                                fontWeight: 'bold',
                                                bgcolor: isToday 
                                                    ? theme.palette.warning.light 
                                                    : theme.palette.grey[200],
                                                color: isToday ? 'white' : 'inherit',
                                                minWidth: 150
                                            }}
                                        >
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {day.format('dddd')}
                                            </Typography>
                                            <Typography variant="caption">
                                                {day.format('DD.MM')}
                                            </Typography>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.keys(planData).map((subeId, rowIndex) => (
                                <TableRow 
                                    key={subeId} 
                                    sx={{ 
                                        '& > *': { verticalAlign: 'top' },
                                        backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#fafafa'
                                    }}
                                >
                                    <TableCell 
                                        component="th" 
                                        scope="row" 
                                        sx={{ 
                                            fontWeight: 'bold',
                                            bgcolor: theme.palette.grey[100],
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 1
                                        }}
                                    >
                                        {planData[subeId].sube_adi}
                                    </TableCell>
                                    {planData[subeId].days.map((dayEvents, dayIndex) => {
                                        const isToday = weekDays[dayIndex].format('YYYY-MM-DD') === today;
                                        return (
                                            <TableCell 
                                                key={dayIndex} 
                                                sx={{
                                                    p: 1,
                                                    bgcolor: isToday 
                                                        ? theme.palette.warning.lighter 
                                                        : 'inherit',
                                                }}
                                            >
                                                {dayEvents.length === 0 ? (
                                                    <Typography 
                                                        variant="caption" 
                                                        color="text.secondary"
                                                        sx={{ fontStyle: 'italic' }}
                                                    >
                                                        Vardiya yok
                                                    </Typography>
                                                ) : (
                                                    dayEvents.map(event => {
                                                        const isOwnShift = currentUser && event.resource?.calisan === currentUser.id;
                                                        return (
                                                            <Paper 
                                                                key={event.id} 
                                                                elevation={2}
                                                                sx={{
                                                                    p: 1.5, 
                                                                    mb: 1,
                                                                    backgroundColor: isOwnShift 
                                                                        ? theme.palette.primary.light 
                                                                        : getVardiyaColor(event.resource.durum),
                                                                    color: isOwnShift 
                                                                        ? theme.palette.primary.contrastText 
                                                                        : 'inherit',
                                                                    border: isOwnShift 
                                                                        ? `2px solid ${theme.palette.primary.dark}` 
                                                                        : 'none',
                                                                    borderRadius: 1,
                                                                    '&:hover': {
                                                                        transform: 'scale(1.02)',
                                                                        transition: 'transform 0.2s'
                                                                    }
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                                    <Typography 
                                                                        variant="body2" 
                                                                        sx={{ fontWeight: 'bold' }}
                                                                    >
                                                                        {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                                                                    </Typography>
                                                                    {event.resource.durum === 'tamamlandi' && (
                                                                        <Chip label="✓" size="small" color="success" />
                                                                    )}
                                                                </Box>
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        display: 'block',
                                                                        fontWeight: isOwnShift ? 'bold' : 'normal'
                                                                    }}
                                                                >
                                                                    {event.resource.calisan_adi}
                                                                </Typography>
                                                            </Paper>
                                                        );
                                                    })
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
}

export default SubeHaftalikPlan;