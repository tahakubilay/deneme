// frontend/src/components/Navbar.js - Avatar Düzeltmesi

import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
    AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, 
    ListItem, ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider,
    useTheme, useMediaQuery, Badge
} from '@mui/material';
import {
    Menu as MenuIcon, CalendarMonth, Business, People, Schedule,
    SwapHoriz, AdminPanelSettings, Settings, Logout, Person,
    QrCode2, BarChart, Favorite, AccessTime, Rule
} from '@mui/icons-material';
import axios from 'axios';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [currentUser, setCurrentUser] = useState(null);
    const [profilResmi, setProfilResmi] = useState(null); // ← YENİ
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('accessToken');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    useEffect(() => {
        const userString = localStorage.getItem('currentUser');
        if (userString) {
            try {
                const user = JSON.parse(userString);
                setCurrentUser(user);
                
                // Profil resmini API'den çek
                axios.get('http://127.0.0.1:8000/api/kullanicilar/profil/', getAuthHeaders())
                    .then(response => {
                        if (response.data.profil_resmi_url) {
                            setProfilResmi(response.data.profil_resmi_url);
                        }
                    })
                    .catch(error => {
                        console.error("Profil resmi alınamadı:", error);
                    });
            } catch (e) { 
                console.error("Kullanıcı bilgisi okunurken hata:", e); 
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
        navigate('/login');
        window.location.reload();
    };

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    if (!currentUser) { 
        return null; 
    }

    const isActive = (path) => location.pathname === path;

    const employeeMenuItems = [
        { text: 'Vardiya Kontrol', path: '/vardiya-kontrol', icon: <QrCode2 /> },
        { text: 'Vardiyalarım', path: '/vardiyalarim', icon: <Schedule /> },
        { text: 'İsteklerim', path: '/isteklerim', icon: <SwapHoriz /> },
        { text: 'Müsaitlik', path: '/musaitlik', icon: <AccessTime /> },
    ];

    const adminMenuItems = [
        { text: 'İstatistikler', path: '/admin/istatistikler', icon: <BarChart /> },
        { text: 'Onaylar', path: '/admin/onaylar', icon: <AdminPanelSettings /> },
        { text: 'Favori Atama', path: '/tercihler', icon: <Favorite /> },
        { text: 'Çalışma Saatleri', path: '/sube-saatleri', icon: <AccessTime /> },
        { text: 'Kurallar', path: '/kisitlama-kurallari', icon: <Rule /> },
    ];

    const commonMenuItems = [
        { text: 'Takvim', path: '/takvim', icon: <CalendarMonth /> },
        { text: 'Şubeler', path: '/subeler', icon: <Business /> },
        { text: 'Kullanıcılar', path: '/kullanicilar', icon: <People /> },
    ];

    // Desktop Navbar
    const DesktopNav = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!currentUser.is_staff && employeeMenuItems.map((item) => (
                <Button
                    key={item.path}
                    color="inherit"
                    component={RouterLink}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                        borderBottom: isActive(item.path) ? '2px solid white' : 'none',
                        borderRadius: 0,
                        pb: 0.5
                    }}
                >
                    {item.text}
                </Button>
            ))}

            {currentUser.is_staff && adminMenuItems.map((item) => (
                <Button
                    key={item.path}
                    color="inherit"
                    component={RouterLink}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                        borderBottom: isActive(item.path) ? '2px solid white' : 'none',
                        borderRadius: 0,
                        pb: 0.5
                    }}
                >
                    {item.text}
                </Button>
            ))}

            {commonMenuItems.map((item) => (
                <Button
                    key={item.path}
                    color="inherit"
                    component={RouterLink}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                        borderBottom: isActive(item.path) ? '2px solid white' : 'none',
                        borderRadius: 0,
                        pb: 0.5
                    }}
                >
                    {item.text}
                </Button>
            ))}

            <IconButton
                onClick={handleProfileMenuOpen}
                sx={{ ml: 2 }}
            >
                <Avatar 
                    src={profilResmi || undefined}  /* ← BURADA DEĞİŞİKLİK */
                    sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                >
                    {!profilResmi && `${currentUser.first_name?.[0]}${currentUser.last_name?.[0]}`}
                </Avatar>
            </IconButton>
        </Box>
    );

    // Mobile Drawer
    const MobileDrawer = () => (
        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
        >
            <Box sx={{ width: 250, pt: 2 }}>
                <Box sx={{ px: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                            src={profilResmi || undefined}  /* ← BURADA DEĞİŞİKLİK */
                            sx={{ bgcolor: 'primary.main' }}
                        >
                            {!profilResmi && `${currentUser.first_name?.[0]}${currentUser.last_name?.[0]}`}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {currentUser.first_name} {currentUser.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {currentUser.is_staff ? 'Yönetici' : 'Çalışan'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Divider />

                <List>
                    {!currentUser.is_staff && employeeMenuItems.map((item) => (
                        <ListItem 
                            button 
                            key={item.path}
                            component={RouterLink}
                            to={item.path}
                            onClick={() => setDrawerOpen(false)}
                            selected={isActive(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItem>
                    ))}

                    {currentUser.is_staff && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <ListItem>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    YÖNETİCİ
                                </Typography>
                            </ListItem>
                            {adminMenuItems.map((item) => (
                                <ListItem 
                                    button 
                                    key={item.path}
                                    component={RouterLink}
                                    to={item.path}
                                    onClick={() => setDrawerOpen(false)}
                                    selected={isActive(item.path)}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItem>
                            ))}
                        </>
                    )}

                    <Divider sx={{ my: 1 }} />
                    {commonMenuItems.map((item) => (
                        <ListItem 
                            button 
                            key={item.path}
                            component={RouterLink}
                            to={item.path}
                            onClick={() => setDrawerOpen(false)}
                            selected={isActive(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItem>
                    ))}

                    <Divider sx={{ my: 1 }} />
                    <ListItem 
                        button 
                        component={RouterLink}
                        to="/profil"
                        onClick={() => setDrawerOpen(false)}
                    >
                        <ListItemIcon><Person /></ListItemIcon>
                        <ListItemText primary="Profilim" />
                    </ListItem>
                    <ListItem button onClick={handleLogout}>
                        <ListItemIcon><Logout /></ListItemIcon>
                        <ListItemText primary="Çıkış Yap" />
                    </ListItem>
                </List>
            </Box>
        </Drawer>
    );

    return (
        <>
            <AppBar position="sticky" elevation={2}>
                <Toolbar>
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={() => setDrawerOpen(true)}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography 
                        variant="h6" 
                        component={RouterLink}
                        to="/takvim"
                        sx={{ 
                            flexGrow: isMobile ? 1 : 0,
                            mr: 4,
                            textDecoration: 'none',
                            color: 'inherit',
                            fontWeight: 'bold'
                        }}
                    >
                        🗓️ Vardiya Sistemi
                    </Typography>

                    {!isMobile && (
                        <>
                            <Box sx={{ flexGrow: 1 }} />
                            <DesktopNav />
                        </>
                    )}
                </Toolbar>
            </AppBar>

            {isMobile && <MobileDrawer />}

            {/* Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Avatar 
                            src={profilResmi || undefined}  /* ← BURADA DEĞİŞİKLİK */
                            sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}
                        >
                            {!profilResmi && `${currentUser.first_name?.[0]}${currentUser.last_name?.[0]}`}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {currentUser.first_name} {currentUser.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {currentUser.email}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Divider />
                <MenuItem 
                    component={RouterLink} 
                    to="/profil"
                    onClick={handleProfileMenuClose}
                >
                    <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                    Profilim
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                    Çıkış Yap
                </MenuItem>
            </Menu>
        </>
    );
}

export default Navbar;