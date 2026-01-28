import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useArenaMatchmaking } from '../hooks/useArenaMatchmaking'; // 🔥 Import Hook xử lý DB
import { translations } from '../utils/translations'; // ✅ Import Translations

// --- SVG DECORATIONS ---
const GameControllerIcon = ({ className }) => (<svg viewBox="0 0 24 24" className={className} fill="none"><rect x="2" y="6" width="20" height="12" rx="3" fill="url(#grad_ctrl)" /><path d="M6 12H8M7 11V13" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><circle cx="14.5" cy="11" r="1" fill="#Facc15" /><circle cx="16.5" cy="13" r="1" fill="#4ade80" /><circle cx="14.5" cy="13" r="1" fill="#3b82f6" /><circle cx="16.5" cy="11" r="1" fill="#ef4444" /><defs><linearGradient id="grad_ctrl" x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#7e22ce" /></linearGradient></defs></svg>);
const DPadDeco = ({ className }) => (<svg viewBox="0 0 100 100" className={className} fill="currentColor"><path d="M35 15H65V35H85V65H65V85H35V65H15V35H35V15Z" rx="5" /><circle cx="50" cy="50" r="15" className="text-slate-100" /></svg>);
const ButtonsDeco = ({ className }) => (<svg viewBox="0 0 100 100" className={className} fill="currentColor"><circle cx="50" cy="20" r="18" /><circle cx="80" cy="50" r="18" /><circle cx="50" cy="80" r="18" /><circle cx="20" cy="50" r="18" /></svg>);

const ArenaLobbyPage = () => {
    const { user, language } = useAppContext();
    const navigate = useNavigate();
    const t = translations[language] || translations.vi; // ✅ Lấy bộ từ điển
    const [realPoints, setRealPoints] = useState(0);

    // --- DATA RANK (Inside component to access translations) ---
    const RANK_SYSTEM = [
        { threshold: 200, key: 'CHALLENGER', name: t.arena_rank_challenger, img: 'https://cdn-icons-png.flaticon.com/128/14235/14235832.png', color: 'text-red-600', bg: 'bg-red-100 border-red-200', ring: 'border-red-500' },
        { threshold: 150, key: 'GRANDMASTER', name: t.arena_rank_grandmaster, img: 'https://cdn-icons-png.flaticon.com/128/17301/17301398.png', color: 'text-rose-600', bg: 'bg-rose-100 border-rose-200', ring: 'border-rose-500' },
        { threshold: 100, key: 'MASTER', name: t.arena_rank_master, img: 'https://cdn-icons-png.flaticon.com/128/18541/18541426.png', color: 'text-purple-600', bg: 'bg-purple-100 border-purple-200', ring: 'border-purple-400' },
        { threshold: 50, key: 'DIAMOND', name: t.arena_rank_diamond, img: 'https://cdn-icons-png.flaticon.com/128/16847/16847167.png', color: 'text-blue-500', bg: 'bg-blue-100 border-blue-200', ring: 'border-blue-400' },
        { threshold: 30, key: 'GOLD', name: t.arena_rank_gold, img: 'https://cdn-icons-png.flaticon.com/128/15304/15304293.png', color: 'text-yellow-600', bg: 'bg-yellow-100 border-yellow-200', ring: 'border-yellow-400' },
        { threshold: 10, key: 'SILVER', name: t.arena_rank_silver, img: 'https://cdn-icons-png.flaticon.com/128/12927/12927321.png', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', ring: 'border-slate-400' },
        { threshold: 0, key: 'BRONZE', name: t.arena_rank_bronze, img: 'https://cdn-icons-png.flaticon.com/128/12927/12927172.png', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200', ring: 'border-orange-400' }
    ];

    // Lấy thông tin Rank từ DB
    useEffect(() => {
        const fetchLatestPoints = async () => {
            if (!user?.id) return;
            const { data } = await supabase.from('users').select('rank_points').eq('id', user.id).single();
            if (data) setRealPoints(data.rank_points || 0);
        };
        fetchLatestPoints();
    }, [user?.id]);

    const currentRankObj = RANK_SYSTEM.find(r => realPoints >= r.threshold) || RANK_SYSTEM[RANK_SYSTEM.length - 1];

    // --- KẾT NỐI VỚI HOOK MATCHMAKING (LOGIC DB) ---
    const handleMatchFound = (matchData) => {
        // matchData chứa: { matchId, players, isHost } lấy từ DB
        navigate('/arena/prep', { state: matchData });
    };

    const { 
        status, 
        onlineCount, 
        desiredPlayers, 
        setDesiredPlayers, 
        startFinding, 
        cancelFinding 
    } = useArenaMatchmaking(user, currentRankObj, handleMatchFound);

    // --- STYLES ---
    const styles = `
        @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
        .bg-white-pattern { background-color: #fcfcfc; background-image: radial-gradient(#e5e7eb 1.5px, transparent 1.5px); background-size: 24px 24px; }
        .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border: 2px solid white; box-shadow: 0 20px 40px -5px rgba(0,0,0,0.05); }
        .animate-ripple { position: absolute; border-radius: 50%; border: 4px solid #3b82f6; opacity: 0; animation: ripple 1.5s infinite ease-out; }
        @keyframes ripple { 0% { transform: scale(0.8); opacity: 1; border-width: 6px; } 100% { transform: scale(2.2); opacity: 0; border-width: 0px; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    `;

    // --- UI SECTIONS ---
    
    // 1. PROFILE SECTION (Bên trái)
    const ProfileSection = () => (
        <div className="glass-card rounded-[2.5rem] p-6 flex flex-col h-full border-4 border-white shadow-xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-3/5 h-full opacity-5 bg-gradient-to-l from-current to-transparent pointer-events-none ${currentRankObj.color}`}></div>
            <div className="flex h-full gap-2">
                
                {/* DANH SÁCH RANK */}
                <div className="w-[40%] border-r border-slate-100 pr-2 flex flex-col pt-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">{t.arena_progress}</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                        {RANK_SYSTEM.slice().reverse().map((rank) => {
                            const isCurrent = currentRankObj.key === rank.key;
                            return (
                                <div key={rank.key} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isCurrent ? 'bg-white shadow-md border border-slate-100 ring-1 ring-slate-200 scale-[1.02]' : 'opacity-60 grayscale'}`}>
                                    <img src={rank.img} className="w-8 h-8 object-contain" alt={rank.name}/>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold ${rank.threshold <= realPoints ? 'text-slate-700' : 'text-slate-400'}`}>{t['rank_' + rank.key.toLowerCase()] || rank.name}</span>
                                        <span className="text-[9px] font-medium text-slate-400">{rank.threshold}+</span>
                                    </div>
                                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto animate-pulse"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* HỒ SƠ CHÍNH */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 pl-2">
                    <div className="relative animate-float filter drop-shadow-2xl z-20 mb-[-15px]">
                        <img src={currentRankObj.img} alt={currentRankObj.name} className="w-40 h-40 md:w-48 md:h-48 object-contain"/>
                        <div className={`absolute inset-0 blur-3xl opacity-30 -z-10 rounded-full ${currentRankObj.bg.split(' ')[0]}`}></div>
                    </div>
                    <div className="relative z-10 mb-2">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white">
                            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.full_name}`} className="w-full h-full object-cover rounded-full" alt=""/>
                        </div>
                    </div>
                    <h2 className="text-lg font-black text-slate-800 truncate max-w-[140px] mb-1">{user.full_name}</h2>
                    <div className={`px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border mb-1 ${currentRankObj.bg} ${currentRankObj.color}`}>
                        {t['rank_' + currentRankObj.key.toLowerCase()] || currentRankObj.name}
                    </div>
                    <div className="text-xl font-black text-slate-600">
                        {realPoints} <span className="text-[10px] text-slate-400 align-top">{t.arena_points}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    // 2. MATCHMAKING SECTION (Bên phải)
    const MatchmakingSection = () => {
        if (status === 'IDLE') {
            return (
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center h-full text-center border-4 border-white shadow-xl relative">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6 group cursor-pointer transition-transform hover:scale-105" onClick={startFinding}>
                        <div className="absolute inset-0 bg-blue-100 rounded-full scale-90 group-hover:scale-100 transition-transform duration-500"></div>
                        <div className="w-24 h-24 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-4xl relative z-10">🔍</div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tight">{t.arena_find_opponent}</h2>
                    
                    {/* CHỌN SỐ NGƯỜI CHƠI */}
                    <div className="w-full max-w-xs mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">{t.arena_mode}</div>
                        <div className="flex gap-2">
                            {[2, 3, 4].map(num => (
                                <button 
                                    key={num}
                                    onClick={() => setDesiredPlayers(num)}
                                    className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${desiredPlayers === num ? 'bg-black text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {num}{t.arena_players}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={startFinding} className="w-full max-w-xs py-4 bg-slate-900 text-white rounded-2xl font-black text-lg uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-slate-950">{t.arena_start_btn}</button>
                </div>
            );
        }
        if (status === 'FINDING') {
            return (
                <div className="glass-card rounded-[2.5rem] p-10 flex flex-col items-center justify-center h-full text-center border-4 border-white shadow-xl">
                    <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                        <div className="animate-ripple inset-0 border-blue-400"></div>
                        <div className="animate-ripple inset-0 border-indigo-400 animation-delay-500"></div>
                        <div className="w-28 h-28 bg-white rounded-full shadow-inner flex items-center justify-center relative z-10 border-4 border-slate-50"><span className="text-5xl animate-bounce">🔍</span></div>
                    </div>
                    <h3 className="text-xl font-black text-blue-600 animate-pulse tracking-wide uppercase mb-1">{t.arena_finding} {desiredPlayers} {t.arena_players}...</h3>
                    <p className="text-slate-400 text-xs mt-2 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {t.arena_found}: {onlineCount}/{desiredPlayers}
                    </p>
                    <button onClick={cancelFinding} className="mt-8 px-8 py-2 bg-white border-2 border-red-100 text-red-400 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm text-sm">{t.arena_cancel}</button>
                </div>
            );
        }
        if (status === 'MATCHED') {
            return (
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center h-full text-center border-4 border-green-100 bg-green-50/50 shadow-xl">
                    <div className="text-6xl mb-6 animate-bounce drop-shadow-md">🎉</div>
                    <h2 className="text-3xl font-black text-green-700 uppercase tracking-widest mb-2">{t.arena_matched}</h2>
                    <p className="text-green-600 font-bold">{t.arena_entering_prep}...</p>
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mt-4"></div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-white-pattern font-sans text-slate-800 flex flex-col overflow-hidden select-none relative">
            <style>{styles}</style>
            <div className="absolute top-1/2 left-10 text-slate-200 hidden lg:block opacity-60 pointer-events-none rotate-[-15deg] -translate-y-1/2"><DPadDeco className="w-80 h-80" /></div>
            <div className="absolute top-1/2 right-10 text-slate-200 hidden lg:block opacity-60 pointer-events-none rotate-[15deg] -translate-y-1/2"><ButtonsDeco className="w-80 h-80" /></div>

            <header className="h-16 px-6 flex justify-between items-center bg-white/80 backdrop-blur-md shadow-sm z-30 shrink-0 border-b border-gray-100">
                <button onClick={() => navigate('/')} className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors border border-slate-200">← {t.back}</button>
                <div className="flex items-center gap-3"><GameControllerIcon className="w-8 h-8 drop-shadow-sm" /><h1 className="text-xl font-black uppercase text-slate-700 tracking-tight">{t.arena_lobby_title}</h1></div>
                <div className="w-20"></div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full h-full min-h-0 relative z-10 flex items-center justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full h-[550px] mt-4 md:mt-0">
                    <div className="h-full relative"><ProfileSection /></div>
                    <div className="h-full"><MatchmakingSection /></div>
                </div>
            </main>
        </div>
    );
};

export default ArenaLobbyPage;