import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { translations } from '../utils/translations';
import { useArenaGame } from '../hooks/useArenaGame';

// === STYLES ===
const customStyles = `
    @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
    
    @keyframes shake { 
        0%, 100% { transform: translateX(0); } 
        25% { transform: translateX(-10px); } 
        75% { transform: translateX(10px); } 
    }
    .animate-shake { animation: shake 0.3s ease-in-out; }
    
    @keyframes pulse-green {
        0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        50% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
    }
    .animate-pulse-green { animation: pulse-green 0.5s ease-out; }
    
    @keyframes countdown-pop {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
    }
    .animate-countdown { animation: countdown-pop 0.5s ease-out; }
    
    @keyframes slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slide-up 0.4s ease-out; }
    
    @keyframes winner-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
        50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8); }
    }
    .animate-winner-glow { animation: winner-glow 1s ease-in-out infinite; }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// === COUNTDOWN OVERLAY ===
const CountdownOverlay = ({ count }) => (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 z-50 flex items-center justify-center">
        <div className="text-center">
            <div 
                key={count} 
                className="text-[12rem] font-black text-white animate-countdown drop-shadow-2xl"
                style={{ textShadow: '0 0 60px rgba(255,255,255,0.5)' }}
            >
                {count > 0 ? count : '⚔️'}
            </div>
            <p className="text-white/80 text-2xl font-bold uppercase tracking-widest mt-4">
                {count > 0 ? 'Chuẩn bị...' : 'CHIẾN ĐẤU!'}
            </p>
        </div>
    </div>
);

// === PLAYER SCORE CARD ===
const PlayerScoreCard = ({ player, score, isMe, winningScore, isWinner, isForfeited }) => {
    const progress = (score / winningScore) * 100;
    
    // Nếu đầu hàng → hiển thị xám
    if (isForfeited) {
        return (
            <div className="relative p-3 rounded-2xl bg-slate-200 opacity-60">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}&background=random`} 
                            className="w-12 h-12 rounded-full border-3 border-slate-300 shadow-md object-cover grayscale"
                            alt={player.full_name}
                        />
                        <div className="absolute -top-1 -right-1 text-xl">🏳️</div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate text-slate-500 line-through">
                            {player.full_name}
                            {isMe && <span className="ml-1 text-[10px] opacity-75">(Bạn)</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">Đã đầu hàng</div>
                    </div>
                    <div className="text-3xl font-black tabular-nums text-slate-400">
                        {score}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`relative p-3 rounded-2xl transition-all duration-300 ${
            isWinner 
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 animate-winner-glow' 
                : isMe 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200' 
                    : 'bg-white border-2 border-slate-200'
        }`}>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img 
                        src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}&background=random`} 
                        className={`w-12 h-12 rounded-full border-3 shadow-md object-cover ${
                            isWinner ? 'border-yellow-200' : isMe ? 'border-white' : 'border-slate-200'
                        }`}
                        alt={player.full_name}
                    />
                    {isWinner && (
                        <div className="absolute -top-1 -right-1 text-xl">👑</div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm truncate ${
                        isWinner || isMe ? 'text-white' : 'text-slate-800'
                    }`}>
                        {player.full_name}
                        {isMe && <span className="ml-1 text-[10px] opacity-75">(Bạn)</span>}
                    </div>
                    {/* Progress bar */}
                    <div className={`h-2 rounded-full mt-1 overflow-hidden ${
                        isWinner || isMe ? 'bg-white/30' : 'bg-slate-200'
                    }`}>
                        <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                                isWinner ? 'bg-white' : isMe ? 'bg-white' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div className={`text-3xl font-black tabular-nums ${
                    isWinner || isMe ? 'text-white' : 'text-indigo-600'
                }`}>
                    {score}
                </div>
            </div>
        </div>
    );
};

// === ROUND WINNER POPUP ===
const RoundWinnerPopup = ({ winner }) => {
    const isSkipped = winner.odlId === null;
    
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 animate-slide-up">
            <div className="bg-white rounded-3xl p-6 shadow-2xl text-center max-w-sm mx-4">
                <div className="text-4xl mb-2">{isSkipped ? '⏭️' : '🎯'}</div>
                <div className={`text-lg font-black mb-2 ${isSkipped ? 'text-amber-600' : 'text-green-600'}`}>
                    {isSkipped ? 'Bỏ qua câu hỏi' : `${winner.odlName} trả lời đúng!`}
                </div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Đáp án đúng</div>
                <div className={`text-2xl font-bold text-slate-800 rounded-xl px-4 py-3 ${isSkipped ? 'bg-amber-100' : 'bg-green-100'}`}>
                    {winner.answer}
                </div>
            </div>
        </div>
    );
};

// === RESULT OVERLAY ===
const ResultOverlay = ({ result, winner, scores, players, myId, onBack }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
            {/* Result Icon */}
            <div className="text-center mb-6">
                <div className="text-[7rem] mb-2">
                    {result === 'WIN' ? '🏆' : '😢'}
                </div>
                <h2 className={`text-4xl font-black uppercase tracking-tight ${
                    result === 'WIN' ? 'text-yellow-500' : 'text-slate-500'
                }`}>
                    {result === 'WIN' ? 'CHIẾN THẮNG!' : 'THUA CUỘC'}
                </h2>
                {winner && (
                    <p className="text-slate-500 mt-2">
                        Người chiến thắng: <span className="font-bold text-slate-800">{winner.full_name}</span>
                    </p>
                )}
            </div>

            {/* Final Scores */}
            <div className="space-y-2 mb-6">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kết quả</div>
                {players
                    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                    .map((player, idx) => (
                        <div 
                            key={player.id}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                                String(player.id) === String(myId)
                                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300' 
                                    : 'bg-slate-50'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                idx === 1 ? 'bg-gray-300 text-gray-700' :
                                'bg-orange-400 text-orange-900'
                            }`}>
                                {idx === 0 ? '👑' : idx + 1}
                            </div>
                            <img 
                                src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}`}
                                className="w-10 h-10 rounded-full border-2 border-white shadow"
                                alt=""
                            />
                            <div className="flex-1 font-bold text-slate-700">
                                {player.full_name}
                            </div>
                            <div className="font-black text-2xl text-indigo-600">{scores[player.id] || 0}</div>
                        </div>
                    ))}
            </div>

            {/* Back Button */}
            <button 
                onClick={onBack}
                className="w-full py-4 bg-gradient-to-r from-slate-800 to-black text-white rounded-xl font-black uppercase tracking-wider hover:shadow-xl active:scale-95 transition-all"
            >
                ← Về Sảnh Chờ
            </button>
        </div>
    </div>
);

const ArenaGamePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, language } = useAppContext();
    const t = translations[language] || translations.vi;
    
    const { matchId, players, config } = location.state || {};
    const inputRef = useRef(null);

    // Validate navigation
    useEffect(() => {
        if (!matchId || !players || !user) {
            navigate('/arena/lobby', { replace: true });
        }
    }, [matchId, players, user, navigate]);

    // Get game hook
    const {
        gamePhase,
        countdown,
        winningScore,
        currentQuestion,
        currentQ,
        scores,
        inputValue,
        setInputValue,
        isLocked,
        roundWinner,
        showAnswer,
        myAnswerStatus,
        gameResult,
        winner,
        submitAnswer,
        voteSkip,
        skipVotes,
        forfeit,
        forfeitedPlayers
    } = useArenaGame(matchId, players, user, config);
    
    // Tính số người active (không forfeit)
    const activePlayers = players?.filter(p => !forfeitedPlayers.includes(String(p.id))) || [];
    const hasVoted = skipVotes.includes(String(user?.id));

    // Focus input
    useEffect(() => {
        if (gamePhase === 'PLAYING' && !isLocked) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [gamePhase, isLocked, currentQ]);

    // Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            submitAnswer(inputValue.trim());
        }
    };

    // Handle back to lobby (forfeit first if game is still active)
    const handleBack = () => {
        if (gamePhase === 'PLAYING' || gamePhase === 'COUNTDOWN') {
            forfeit();
        }
        navigate('/arena/lobby', { replace: true });
    };
    
    // Handle browser back button
    useEffect(() => {
        const handlePopState = (e) => {
            if (gamePhase === 'PLAYING' || gamePhase === 'COUNTDOWN') {
                forfeit();
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [gamePhase, forfeit]);

    if (!matchId || !players) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50 flex flex-col font-sans overflow-hidden select-none">
            <style>{customStyles}</style>

            {/* Countdown Overlay */}
            {gamePhase === 'COUNTDOWN' && <CountdownOverlay count={countdown} />}

            {/* Result Overlay */}
            {gamePhase === 'FINISHED' && gameResult && (
                <ResultOverlay 
                    result={gameResult}
                    winner={winner}
                    scores={scores}
                    players={players}
                    myId={user.id}
                    onBack={handleBack}
                />
            )}

            {/* HEADER */}
            <header className="px-4 py-3 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button 
                        onClick={() => {
                            if (confirm('Bạn có chắc muốn đầu hàng? Bạn sẽ thua trận này.')) {
                                forfeit();
                                // Navigate to lobby after forfeiting
                                setTimeout(() => navigate('/arena/lobby', { replace: true }), 500);
                            }
                        }}
                        className="px-4 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
                    >
                        🏳️ Đầu hàng
                    </button>

                    {/* Target Score */}
                    <div className="text-center">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mục tiêu</div>
                        <div className="text-2xl font-black text-indigo-600">{winningScore} điểm</div>
                    </div>

                    {/* Question Counter */}
                    <div className="px-4 py-2 bg-slate-100 rounded-xl">
                        <div className="text-xs text-slate-400 font-bold">Câu hỏi</div>
                        <div className="text-lg font-black text-slate-700">{currentQ + 1}</div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full">
                {/* Players Score Bar */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {players.map(player => (
                        <PlayerScoreCard 
                            key={player.id}
                            player={player}
                            score={scores[player.id] || 0}
                            isMe={String(player.id) === String(user.id)}
                            winningScore={winningScore}
                            isWinner={roundWinner?.odlId === player.id}
                            isForfeited={forfeitedPlayers?.includes(String(player.id)) || forfeitedPlayers?.includes(player.id)}
                        />
                    ))}
                </div>

                {/* Question Card */}
                {gamePhase === 'PLAYING' && currentQuestion && (
                    <div className="flex-1 flex flex-col animate-slide-up">
                        {/* Question Display */}
                        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                            
                            {/* Round Winner Popup */}
                            {showAnswer && roundWinner && (
                                <RoundWinnerPopup winner={roundWinner} />
                            )}

                            {/* Hint Badge */}
                            <div className={`px-5 py-2 rounded-2xl font-bold text-sm uppercase tracking-wider mb-6 ${
                                currentQuestion.askMeaning 
                                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-200' 
                                    : 'bg-orange-100 text-orange-600 border-2 border-orange-200'
                            }`}>
                                {currentQuestion.askMeaning ? '📖 Nhập NGHĨA' : '🗣️ Nhập CÁCH ĐỌC'}
                            </div>

                            {/* Kanji */}
                            <h1 
                                className="text-[8rem] md:text-[10rem] leading-none text-slate-800 mb-6 drop-shadow-lg"
                                style={{ fontFamily: "'DFKai-SB', serif" }}
                            >
                                {currentQuestion.question}
                            </h1>

                            {/* Type Tag */}
                            <div className="px-4 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">
                                {currentQuestion.type === 'kanji' ? '漢字 Kanji' : '熟語 Jukugo'}
                            </div>
                        </div>

                        {/* Answer Input */}
                        <form onSubmit={handleSubmit} className="mt-4">
                            <div className="flex gap-3">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isLocked}
                                    placeholder={currentQuestion.askMeaning 
                                        ? 'Nhập nghĩa (VD: nhật, mặt trời)...' 
                                        : 'Nhập cách đọc (VD: にち, nichi)...'
                                    }
                                    className={`flex-1 text-center text-2xl font-bold rounded-2xl border-4 outline-none transition-all px-6 py-4 ${
                                        isLocked
                                            ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : myAnswerStatus === 'correct'
                                                ? 'border-green-500 bg-green-50 text-green-700 animate-pulse-green'
                                                : myAnswerStatus === 'wrong'
                                                    ? 'border-red-500 bg-red-50 text-red-700 animate-shake'
                                                    : 'border-indigo-300 focus:border-indigo-500 text-slate-800 bg-white'
                                    }`}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={isLocked || !inputValue.trim()}
                                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg uppercase tracking-wider hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                                >
                                    GỬI
                                </button>
                                <button
                                    type="button"
                                    onClick={voteSkip}
                                    disabled={isLocked || hasVoted}
                                    className={`px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider hover:shadow-xl disabled:cursor-not-allowed active:scale-95 transition-all flex flex-col items-center gap-0.5 ${
                                        hasVoted 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                    } ${isLocked ? 'opacity-50' : ''}`}
                                    title="Vote bỏ qua câu này (cần tất cả đồng ý)"
                                >
                                    <span>{hasVoted ? '✓' : '🗳️'}</span>
                                    <span className="text-xs">{skipVotes.length}/{activePlayers.length}</span>
                                </button>
                            </div>
                            
                            {/* Vote status */}
                            {skipVotes.length > 0 && !isLocked && (
                                <p className="text-center text-amber-600 text-sm mt-2 font-semibold">
                                    🗳️ {skipVotes.length}/{activePlayers.length} người muốn bỏ qua
                                    {!hasVoted && ' - Bấm để vote!'}
                                </p>
                            )}
                            
                            {/* Hint text */}
                            <p className="text-center text-slate-400 text-sm mt-2">
                                💡 Ai trả lời đúng trước sẽ ghi điểm! Vote 🗳️ nếu không biết (cần tất cả đồng ý).
                            </p>
                        </form>
                    </div>
                )}

                {/* Loading State */}
                {gamePhase === 'LOADING' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-500 font-bold text-lg">Đang kết nối trận đấu...</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ArenaGamePage;
