// src/components/SubeHaftalikPlan.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, CircularProgress, IconButton, useTheme
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

        const weeklyEvents = events.filter(event => moment(event.start).isBetween(weekStart, weekEnd, undefined, '[]'));

        const data = subeler.reduce((acc, sube) => {
            acc[sube.id] = { sube_adi: sube.sube_adi, days: Array(7).fill(null).map(() => []) };
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

    return (
        <Paper sx={{ p: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevWeek} aria-label="önceki hafta">
                    <ArrowBackIos />
                </IconButton>
                <Typography variant="h6">
                    {currentWeek.format('DD MMMM YYYY')} - {currentWeek.clone().add(6, 'days').format('DD MMMM YYYY')}
                </Typography>
                <IconButton onClick={handleNextWeek} aria-label="sonraki hafta">
                    <ArrowForwardIos />
                </IconButton>
            </Box>

            {(loading || eventsLoading) ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
            ) : (
                <TableContainer sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader sx={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '15%', bgcolor: 'grey.200' }}>Şube</TableCell>
                                {weekDays.map(day => (
                                    <TableCell 
                                        key={day.format('YYYY-MM-DD')} 
                                        align="center" 
                                        sx={{
                                            fontWeight: 'bold',
                                            bgcolor: day.format('YYYY-MM-DD') === today ? theme.palette.action.hover : 'grey.200',
                                        }}
                                    >
                                        {day.format('dddd')}<br/>
                                        <Typography variant="caption">{day.format('DD.MM')}</Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.keys(planData).map((subeId, rowIndex) => (
                                <TableRow 
                                    key={subeId} 
                                    sx={{ 
                                        '& > *': { verticalAlign: 'top', border: 0 },
                                        backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#fafafa'
                                    }}
                                >
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                                        {planData[subeId].sube_adi}
                                    </TableCell>
                                    {planData[subeId].days.map((dayEvents, dayIndex) => (
                                        <TableCell 
                                            key={dayIndex} 
                                            sx={{
                                                p: 0.5,
                                                borderBottom: '1px solid #eee',
                                                bgcolor: weekDays[dayIndex].format('YYYY-MM-DD') === today ? theme.palette.action.hover : 'inherit',
                                            }}
                                        >
                                            {dayEvents.map(event => {
                                                const isOwnShift = currentUser && event.resource?.calisan === currentUser.id;
                                                return (
                                                    <Paper 
                                                        key={event.id} 
                                                        elevation={1}
                                                        sx={{
                                                            p: 1, 
                                                            mb: 0.5, 
                                                            backgroundColor: isOwnShift ? theme.palette.primary.light : theme.palette.grey[100],
                                                            color: isOwnShift ? theme.palette.primary.contrastText : 'inherit',
                                                        }}
                                                    >
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                            {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                                                        </Typography>
                                                        <Typography variant="caption">{event.resource.calisan_adi}</Typography>
                                                    </Paper>
                                                );
                                            })}
                                        </TableCell>
                                    ))}
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