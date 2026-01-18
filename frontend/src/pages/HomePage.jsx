import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import { useAppContext } from '../context/AppContext'; // Import Context để lấy 't'

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useAppContext(); // Lấy bộ từ điển ngôn ngữ hiện tại

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <Sidebar />

      {/* 2. NỘI DUNG SẢNH CHÍNH */}
      <main className="flex-1 p-6 h-full overflow-hidden flex flex-col items-center justify-center relative">
         
         {/* Background trang trí */}
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

         <div className="z-10 text-center max-w-3xl animate-fade-in space-y-10">
            
            {/* Logo Hán Tự */}
            <div className="w-24 h-24 bg-black text-white rounded-3xl mx-auto flex items-center justify-center text-6xl font-serif shadow-2xl mb-6">
                漢
            </div>
            
            {/* Tiêu đề & Slogan (Đa ngôn ngữ) */}
            <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-3">
                    {t?.home_welcome || "Xin chào, Lữ khách!"}
                </h1>
                <p className="text-gray-400 font-bold text-xl italic font-serif">
                    "{t?.home_subtitle || "Hôm nay bạn muốn học gì nào?"}"
                </p>
            </div>

            {/* Các nút chức năng to */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-8 px-8">
                
                {/* Nút vào Viết tay */}
                <button 
                    onClick={() => navigate('/viet-tay')}
                    className="group bg-white border-2 border-gray-100 p-8 rounded-[2rem] shadow-xl shadow-gray-100/50 hover:border-black hover:-translate-y-2 transition-all flex flex-col items-center gap-4"
                >
                    <span className="text-5xl bg-gray-50 p-4 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">🖌️</span>
                    <span className="font-black text-gray-700 text-lg uppercase tracking-wide">
                        {t?.home_btn_write || "Tra cứu Viết tay"}
                    </span>
                </button>

                {/* Nút vào Chatbot */}
                <button 
                    onClick={() => navigate('/chat')}
                    className="group bg-white border-2 border-gray-100 p-8 rounded-[2rem] shadow-xl shadow-gray-100/50 hover:border-[#F48FB1] hover:-translate-y-2 transition-all flex flex-col items-center gap-4"
                >
                    <span className="text-5xl bg-pink-50 p-4 rounded-2xl group-hover:bg-[#F48FB1] group-hover:text-white transition-colors">
                        {/* Icon Lão mini */}
                        <svg viewBox="0 0 100 100" className="w-12 h-12">
                             <path d="M10 40 L50 10 L90 40 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                             <path d="M35 45 Q50 45 65 45 L65 55 Q50 65 35 55 Z" fill="currentColor" />
                        </svg>
                    </span>
                    <span className="font-black text-gray-700 text-lg uppercase tracking-wide">
                        {t?.home_btn_chat || "Hỏi Lão Vô Danh"}
                    </span>
                </button>

            </div>
         </div>
      </main>
    </div>
  );
};

export default HomePage;