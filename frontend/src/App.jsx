import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ... Các import cũ
import HomePage from './pages/HomePage';
import WritePage from './pages/WritePage';
import AiChatPage from './pages/AiChatPage';
import LoginPage from './pages/LoginPage';
import AuthPage from './pages/AuthPage';
import UserProfilePage from './pages/UserProfilePage';

// ✅ 1. IMPORT TRANG CHI TIẾT (Kiểm tra lại tên file thực tế của bạn nhé)
import KanjiDetailPage from './pages/KanjiDetailPage'; 

function App() {
  return (
    <div className="App min-h-screen bg-[#fdfbf7]">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/viet-tay" element={<WritePage />} />
        <Route path="/chat" element={<AiChatPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        
        {/* ✅ 2. THÊM ROUTE NÀY ĐỂ BẤM VÀO NÚT "HIỂU SÂU" SẼ CHẠY */}
        <Route path="/kanji/:kanji" element={<KanjiDetailPage />} />

        {/* Auth & Redirect */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;