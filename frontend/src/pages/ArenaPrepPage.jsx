import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext'; // ✅ Import useAppContext
import { translations } from '../utils/translations'; // ✅ Import Translations

const styles = `
    @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;900&display=swap');
    .font-game { font-family: 'M PLUS Rounded 1c', sans-serif; }
    
    /* Animated Background */
    .bg-gradient-animate { 
        background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
        background-size: 400% 400%;
        animation: gradientShift 15s ease infinite;
    }
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    /* Floating particles */
    .particle {
        position: absolute;
        background: white;
        border-radius: 50%;
        opacity: 0.1;
        animation: float 8s ease-in-out infinite;
    }
    @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-30px) rotate(180deg); }
    }
    
    /* Player card animations */
    .player-card-enter { 
        animation: slideInBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; 
        opacity: 0;
    }
    @keyframes slideInBounce {
        0% { opacity: 0; transform: translateY(50px) scale(0.8); }
        60% { transform: translateY(-10px) scale(1.05); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    /* Spinning wheel */
    .wheel-spin { 
        animation: wheelRotate 0.08s linear infinite;
        filter: blur(3px);
    }
    @keyframes wheelRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .wheel-locked {
        animation: wheelLock 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    }
    @keyframes wheelLock {
        0% { transform: scale(1.3) rotate(360deg); filter: blur(3px); }
        60% { transform: scale(0.95) rotate(0deg); filter: blur(0); }
        100% { transform: scale(1) rotate(0deg); filter: blur(0); }
    }
    
    /* Glow pulse */
    .glow-pulse {
        animation: glowPulse 2s ease-in-out infinite;
    }
    @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(139, 92, 246, 0.3); }
        50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.8), 0 0 80px rgba(139, 92, 246, 0.5); }
    }
    
    /* VS Badge */
    .vs-badge {
        animation: vsPulse 1.5s ease-in-out infinite;
    }
    @keyframes vsPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    /* Number flicker */
    .number-flicker {
        text-shadow: 0 0 20px rgba(99, 102, 241, 0.8),
                     0 0 40px rgba(139, 92, 246, 0.6),
                     0 0 60px rgba(167, 139, 250, 0.4);
    }
    
    /* Title entrance */
    .title-enter {
        animation: titleSlide 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        opacity: 0;
    }
    @keyframes titleSlide {
        from { opacity: 0; transform: translateY(-50px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

const PlayerCard = ({ player, index, side }) => {
    // Get rank color styles
    const getRankStyle = () => {
        if (!player.rankColor) {
            return 'text-slate-600 bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-300';
        }
        
        const color = player.rankColor.split('-')[1];
        if (color === 'blue') return 'text-blue-700 bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-300';
        if (color === 'green') return 'text-green-700 bg-gradient-to-r from-green-100 to-green-50 border border-green-300';
        if (color === 'purple') return 'text-purple-700 bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-300';
        if (color === 'yellow') return 'text-yellow-700 bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300';
        if (color === 'red') return 'text-red-700 bg-gradient-to-r from-red-100 to-red-50 border border-red-300';
        if (color === 'pink') return 'text-pink-700 bg-gradient-to-r from-pink-100 to-pink-50 border border-pink-300';
        return 'text-slate-600 bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-300';
    };
    
    return (
        <div 
            className="flex flex-col items-center p-4 md:p-5 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-white/50 player-card-enter relative overflow-hidden w-36 md:w-40 hover:scale-105 transition-transform duration-300" 
            style={{ animationDelay: `${index * 0.12}s` }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-blue-50/50"></div>
            
            <div className={`absolute top-2 ${side === 'left' ? 'left-2' : 'right-2'} w-2 h-2 rounded-full ${side === 'left' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></div>
            
            <div className="relative z-10 mb-3">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-400 to-blue-400 rounded-full blur-md opacity-40"></div>
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-xl overflow-hidden relative bg-gradient-to-br from-slate-100 to-slate-200">
                    <img 
                        src={player.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random`} 
                        className="w-full h-full object-cover" 
                        alt={player.full_name} 
                    />
                </div>
            </div>
            
            <div className="text-center z-10 w-full space-y-1">
                <div className="font-black text-slate-800 text-xs md:text-sm w-full px-1 leading-tight" title={player.full_name}>
                    {player.full_name}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block shadow-sm ${getRankStyle()}`}>
                    {player.rankName || 'TÂN BINH'}
                </div>
            </div>
        </div>
    );
};

const ArenaPrepPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useAppContext(); // ✅ Lấy language từ Context
    const t = translations[language] || translations.vi; // ✅ Lấy bộ từ điển
    const { matchId, players, isHost } = location.state || {};

    const [lessonNum, setLessonNum] = useState(1);
    const [isSpinning, setIsSpinning] = useState(false);
    const [statusText, setStatusText] = useState(t.arena_connecting);
    const [finalLesson, setFinalLesson] = useState(null);
    const channelRef = useRef(null);

    // [FIX 2] Nếu lỗi, quay về Lobby thay vì về /arena chung chung
    if (!matchId || !players) return <Navigate to="/arena/lobby" replace />;

    const midPoint = Math.ceil(players.length / 2);
    const leftPlayers = players.slice(0, midPoint);
    const rightPlayers = players.slice(midPoint);

    useEffect(() => {
        const channel = supabase.channel(`prep_${matchId}`);
        channel
            .on('broadcast', { event: 'SPIN_START' }, ({ payload }) => {
                startSpinAnimation(payload.targetLesson);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    if (isHost) {
                        setStatusText(t.arena_host_choosing);
                        setTimeout(() => {
                            const randomLesson = Math.floor(Math.random() * 32) + 1;
                            channel.send({ type: 'broadcast', event: 'SPIN_START', payload: { targetLesson: randomLesson } });
                            startSpinAnimation(randomLesson);
                        }, 2000); 
                    } else {
                        setStatusText(t.arena_waiting_spin);
                    }
                }
            });
        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, []);

    const startSpinAnimation = (target) => {
        setIsSpinning(true);
        setStatusText(t.arena_spinning);
        let counter = 0;
        const interval = setInterval(() => {
            setLessonNum(Math.floor(Math.random() * 32) + 1);
            counter++;
            if (counter >= 30) {
                clearInterval(interval);
                setLessonNum(target);
                setIsSpinning(false);
                setFinalLesson(target);
                setStatusText(`${t.arena_topic} ${target}`);
                setTimeout(() => goToGame(target), 2000);
            }
        }, 80);
    };

    const goToGame = (lessonId) => {
        const gameConfig = { lesson: lessonId, questionCount: 20, checkMeaning: true, checkReading: true, enableWriting: true, timeMode: 'normal' };
        navigate('/arena/play', { 
            state: { matchId, players, isHost, config: gameConfig },
            replace: true 
        });
    };

    return (
        <div className="h-screen w-screen bg-gradient-animate flex flex-col items-center justify-center font-game overflow-hidden relative select-none">
            <style>{styles}</style>
            
            {/* Floating particles */}
            {[...Array(15)].map((_, i) => (
                <div 
                    key={i}
                    className="particle"
                    style={{
                        width: Math.random() * 6 + 3 + 'px',
                        height: Math.random() * 6 + 3 + 'px',
                        left: Math.random() * 100 + '%',
                        top: Math.random() * 100 + '%',
                        animationDelay: Math.random() * 8 + 's',
                        animationDuration: Math.random() * 5 + 5 + 's'
                    }}
                />
            ))}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10"></div>
            
            <div className="relative z-10 w-full max-w-7xl flex flex-col items-center p-4 md:p-8">
                {/* Header */}
                <div className="mb-8 md:mb-12 text-center title-enter">
                    <div className="inline-block px-5 py-2 bg-white/20 backdrop-blur-md text-white rounded-full font-black text-xs tracking-widest border border-white/30 mb-3 shadow-lg">
                        {matchId ? `⚔️ ${t.arena_match_id} #${matchId.slice(-6).toUpperCase()}` : '⚔️ PRE-MATCH'}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-4 drop-shadow-2xl" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                        {t.arena_prep_title}
                    </h1>
                    <div className={`inline-block px-10 py-4 rounded-2xl font-black text-sm md:text-base tracking-widest shadow-2xl transition-all duration-500 border-2 ${
                        finalLesson 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white scale-110 border-white/50 glow-pulse' 
                            : 'bg-white/90 backdrop-blur-md text-slate-800 border-white/50'
                    }`}>
                        {statusText}
                    </div>
                </div>
                
                {/* Main content - Optimized for 1280x720 */}
                <div className="flex items-center justify-center gap-8 w-full max-w-6xl">
                    {/* Players grid - left side */}
                    <div className="flex flex-col gap-4">
                        {leftPlayers.map((p, i) => (
                            <PlayerCard key={p.id} player={p} index={i} side="left" />
                        ))}
                    </div>
                    
                    {/* Center wheel */}
                    <div className="relative flex-shrink-0">
                        {/* Glow effect */}
                        <div className={`absolute inset-0 bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 rounded-full blur-3xl transition-all duration-500 ${
                            isSpinning ? 'opacity-60 scale-110' : finalLesson ? 'opacity-50 scale-100' : 'opacity-30 scale-90'
                        }`}></div>
                        
                        {/* Spinning wheel */}
                        <div className={`w-64 h-64 bg-white/95 backdrop-blur-sm rounded-full shadow-2xl border-8 border-white/70 flex flex-col items-center justify-center relative overflow-hidden ${
                            isSpinning ? 'wheel-spin' : finalLesson ? 'wheel-locked' : ''
                        }`}>
                            {/* Inner rings */}
                            <div className="absolute inset-4 border-4 border-purple-100 rounded-full"></div>
                            <div className="absolute inset-8 border-2 border-blue-100 rounded-full"></div>
                            
                            {/* Content - Just the number */}
                            <div className="relative z-10 flex items-center justify-center h-full">
                                <div className={`font-black leading-none transition-all duration-200 ${
                                    isSpinning 
                                        ? 'text-9xl text-slate-300' 
                                        : finalLesson 
                                            ? 'text-[10rem] bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent number-flicker' 
                                            : 'text-9xl text-slate-200'
                                }`}>
                                    {lessonNum}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Players grid - right side */}
                    <div className="flex flex-col gap-4">
                        {rightPlayers.map((p, i) => (
                            <PlayerCard key={p.id} player={p} index={i + midPoint} side="right" />
                        ))}
                    </div>
                </div>
                
                {/* Bottom decorative line */}
                <div className="mt-12 w-full max-w-md h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"></div>
            </div>
        </div>
    );
};

export default ArenaPrepPage;