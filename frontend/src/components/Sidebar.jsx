import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, t } = useAppContext(); // Lấy biến t

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    const baseClass = "px-4 py-3.5 rounded-2xl cursor-pointer flex items-center gap-3 transition-all";
    return isActive 
      ? `${baseClass} bg-black text-white shadow-md` 
      : `${baseClass} text-gray-400 hover:text-black hover:bg-gray-50 font-bold`;
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-100 p-6 flex flex-col shadow-sm z-10 flex-shrink-0 h-screen font-sans">
      
      {/* LOGO */}
      <div className="mb-10 flex items-center gap-3 select-none cursor-pointer group" onClick={() => navigate('/')}>
         <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-2xl shadow-xl transition-transform group-hover:scale-105" style={{ fontFamily: "'Yuji Syuku', serif" }}>漢</div>
         <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1" style={{ fontFamily: "'Yuji Syuku', serif" }}>KAN</h1>
      </div>

      {/* MENU */}
      <nav className="flex-1 space-y-2 text-sm">
        
        {/* ✅ SỬA: Dùng t.menu_home */}
        <div onClick={() => navigate('/')} className={getLinkClass('/')}>
            <span className="text-xl">🏠</span>
            <span>{t?.menu_home || "Trang chủ"}</span>
        </div>

        <div onClick={() => navigate('/viet-tay')} className={getLinkClass('/viet-tay')}>
            <span className="text-xl">✍️</span> 
            <span>{t?.menu_handwriting || "Tra cứu"}</span>
        </div>

        <div onClick={() => navigate('/chat')} className={getLinkClass('/chat')}>
            <svg className="w-6 h-6 shrink-0 mb-1" viewBox="0 0 100 100" fill="currentColor" stroke="none">
                 <path d="M10 45 L50 10 L90 45 Z" />
                 <path d="M35 50 Q50 90 65 50 Z" />
            </svg>
            <span>{t?.menu_chatbot || "Chatbot"}</span>
        </div>

        <div className={getLinkClass('/tu-dien')}>
            <span className="text-xl">📖</span> 
            <span>{t?.menu_dictionary || "Từ điển"}</span>
        </div>

      </nav>

      {/* USER INFO */}
      <div className="mt-auto pt-6 border-t border-gray-100">
         <div 
            onClick={() => navigate('/profile')} 
            className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-100/50 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all group"
         >
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shadow-sm overflow-hidden">
               {user?.avatar ? (
                   <img src={user.avatar} alt="Avt" className="w-full h-full object-cover" />
               ) : (
                   <span>{user?.name?.charAt(0) || 'U'}</span>
               )}
            </div>
            <div className="flex flex-col">
               <span className="font-bold text-sm text-slate-800 uppercase group-hover:text-black truncate max-w-[120px]">
                   {user?.name || user?.full_name || 'Khách'}
               </span>
               {/* ✅ SỬA: Dùng t.menu_profile_view */}
               <span className="text-[10px] text-slate-400 font-bold group-hover:text-blue-500 transition-colors uppercase">
                   {t?.menu_profile_view || "XEM HỒ SƠ"} ➝
               </span>
            </div>
         </div>
      </div>

    </aside>
  );
};

export default Sidebar;