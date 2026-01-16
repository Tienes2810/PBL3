import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import KanjiDetailPage from './pages/KanjiDetailPage'; 

function App() {
  return (
    // Lưu ý: KHÔNG bọc thẻ <Router> ở đây nữa (vì đã có trong main.jsx)
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/home" element={<HomePage />} />
      
      {/* Route động để vào trang chi tiết */}
      <Route path="/kanji/:character" element={<KanjiDetailPage />} />
    </Routes>
  );
}

export default App;