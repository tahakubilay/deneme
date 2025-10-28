// src/App.js

import axios from 'axios'; // YENİ
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VardiyalarimPage from './pages/VardiyalarimPage';
// Sayfalarımızı import ediyoruz
import LoginPage from './pages/LoginPage';
import BranchListPage from './pages/BranchListPage';
import UserListPage from './pages/UserListPage';
import AvailabilityPage from './pages/AvailabilityPage';
import TakvimPage from './pages/TakvimPage';
import IsteklerimPage from './pages/IsteklerimPage';
import AdminOnayPage from './pages/AdminOnayPage';
import TercihlerPage from './pages/TercihlerPage';
import SubeSaatleriPage from './pages/SubeSaatleriPage';
import KisitlamaKurallariPage from './pages/KisitlamaKurallariPage';
import VardiyaKontrolPage from './pages/VardiyaKontrolPage';
import IstatistiklerPage from './pages/IstatistiklerPage';
import ProfilPage from './pages/ProfilPage';
import AdminProfilOnayPage from './pages/AdminProfilOnayPage';
import TopluIceAktarmaPage from './pages/TopluAktarmaPage';


// Bileşenlerimizi import ediyoruz
import Navbar from './components/Navbar';
import './App.css';

function App() {

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          const token = localStorage.getItem('accessToken');
          if (token) { // Sadece token varsa ve geçersizse bu işlemi yap
            console.log("Geçersiz veya süresi dolmuş token. Çıkış yapılıyor.");
            localStorage.removeItem('accessToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/login'; // useNavigate yerine doğrudan yönlendirme
            alert("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");
          }
        }
        return Promise.reject(error);
      }
    );

    // component unmount olduğunda interceptor'ı temizle
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        {/* Navbar, Rotaların dışında olmalı ki her sayfada görünsün */}
        <Navbar />

        <main>
          {/* Routes bloğunun içinde SADECE Route bileşenleri olmalı */}
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/subeler" element={<BranchListPage />} />
            <Route path="/kullanicilar" element={<UserListPage />} />
            <Route path="/musaitlik" element={<AvailabilityPage />} />
            <Route path="/takvim" element={<TakvimPage />} />
            <Route path="/isteklerim" element={<IsteklerimPage />} />
            <Route path="/vardiyalarim" element={<VardiyalarimPage />} />
            <Route path="/admin/onaylar" element={<AdminOnayPage />} />
            <Route path="/tercihler" element={<TercihlerPage />} />
            <Route path="/sube-saatleri" element={<SubeSaatleriPage />} />
            <Route path="/kisitlama-kurallari" element={<KisitlamaKurallariPage />} />
            <Route path="/" element={<Navigate replace to="/login" />} />
            <Route path="/vardiya-kontrol" element={<VardiyaKontrolPage />} />
            <Route path="/profil" element={<ProfilPage />} />
            <Route path="/admin/istatistikler" element={<IstatistiklerPage />} />
            <Route path="/admin/profil-onaylari" element={<AdminProfilOnayPage />} />
            <Route path="/admin/toplu-ice-aktar" element={<TopluIceAktarmaPage />} />
            <Route path="/vardiya-kontrol" element={<VardiyaKontrolPage />} />
            <Route path="/profil" element={<ProfilPage />} />
            <Route path="/admin/istatistikler" element={<IstatistiklerPage />} />


          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;