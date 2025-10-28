// src/App.js - TAMAMI

import axios from 'axios';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Sayfaları import et
import LoginPage from './pages/LoginPage';
import BranchListPage from './pages/BranchListPage';
import UserListPage from './pages/UserListPage';
import AvailabilityPage from './pages/AvailabilityPage';
import TakvimPage from './pages/TakvimPage';
import IsteklerimPage from './pages/IsteklerimPage';
import VardiyalarimPage from './pages/VardiyalarimPage';
import AdminOnayPage from './pages/AdminOnayPage';
import TercihlerPage from './pages/TercihlerPage';
import SubeSaatleriPage from './pages/SubeSaatleriPage';
import KisitlamaKurallariPage from './pages/KisitlamaKurallariPage';
import VardiyaKontrolPage from './pages/VardiyaKontrolPage';
import IstatistiklerPage from './pages/IstatistiklerPage';
import ProfilPage from './pages/ProfilPage';
import AdminProfilOnayPage from './pages/AdminProfilOnayPage';
import TopluIceAktarmaPage from './pages/TopluIceAktarmaPage'; // ← YENİ

import Navbar from './components/Navbar';
import './App.css';

function App() {
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          const token = localStorage.getItem('accessToken');
          if (token) {
            console.log("Geçersiz veya süresi dolmuş token. Çıkış yapılıyor.");
            localStorage.removeItem('accessToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
            alert("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/subeler" element={<BranchListPage />} />
            <Route path="/kullanicilar" element={<UserListPage />} />
            <Route path="/musaitlik" element={<AvailabilityPage />} />
            <Route path="/takvim" element={<TakvimPage />} />
            <Route path="/isteklerim" element={<IsteklerimPage />} />
            <Route path="/vardiyalarim" element={<VardiyalarimPage />} />
            <Route path="/vardiya-kontrol" element={<VardiyaKontrolPage />} />
            <Route path="/profil" element={<ProfilPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/onaylar" element={<AdminOnayPage />} />
            <Route path="/admin/profil-onaylari" element={<AdminProfilOnayPage />} />
            <Route path="/admin/istatistikler" element={<IstatistiklerPage />} />
            <Route path="/admin/toplu-ice-aktar" element={<TopluIceAktarmaPage />} />
            
            <Route path="/tercihler" element={<TercihlerPage />} />
            <Route path="/sube-saatleri" element={<SubeSaatleriPage />} />
            <Route path="/kisitlama-kurallari" element={<KisitlamaKurallariPage />} />
            
            <Route path="/" element={<Navigate replace to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
