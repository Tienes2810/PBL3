import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import KanjiDetailPage from './pages/KanjiDetailPage'; 

// 👇 Dòng này phải khớp với tên file UserProfile.jsx trong thư mục
import UserProfilePage from './pages/UserProfile'; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/kanji/:character" element={<KanjiDetailPage />} />
      
      {/* Route này giữ nguyên */}
      <Route path="/profile" element={<UserProfilePage />} />
    </Routes>
  );
}

export default App;