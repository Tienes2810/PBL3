import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations'; // Import file vừa tạo

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // Lấy ngôn ngữ từ LocalStorage hoặc mặc định là 'vi'
  const [language, setLanguage] = useState(() => localStorage.getItem('appLang') || 'vi');

  // Biến 't' chứa toàn bộ text của ngôn ngữ hiện tại
  const t = translations[language];

  // Hàm login giả lập hoặc thật (tùy code cũ của bạn)
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('session', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('session');
  };

  const updateUserInfo = (newInfo) => {
    setUser(prev => ({ ...prev, ...newInfo }));
  };

  // Check session khi F5
  useEffect(() => {
    const session = localStorage.getItem('session');
    if (session) setUser(JSON.parse(session));
  }, []);

  // Lưu ngôn ngữ khi thay đổi
  useEffect(() => {
    localStorage.setItem('appLang', language);
  }, [language]);

  return (
    <AppContext.Provider value={{ 
        user, setUser, login, logout, updateUserInfo, 
        language, setLanguage, 
        t // Xuất biến t ra để các trang dùng
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);