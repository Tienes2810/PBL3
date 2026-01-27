import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useRaceGame } from '../hooks/useRaceGame';

const styles = `
    @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
    .font-kanji { font-family: 'DFKai-SB', serif; }
    
    @keyframes shake { 
        0%, 100% { transform: translateX(0); } 
        20% { transform: translateX(-6px) rotate(-2deg); } 
        40% { transform: translateX(6px) rotate(2deg); }
        60% { transform: translateX(-6px) rotate(-2deg); }
        80% { transform: translateX(6px) rotate(2deg); }
    }
    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .animate-float { animation: float 6s ease-in-out infinite; }

    .cell-shadow { box-shadow: inset 2px 2px 5px rgba(0,0,0,0.05); }
    .runner-move { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
    
    /* Animation cho Result Overlay */
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .animate-fade-in { animation: fade-in 0.5s ease-out; }
`;

const RealControllerIcon = ({ className, style }) => (
    <div className={className} style={style}>
        <img 
            src="/images/controller-icon.png" 
            alt="Controller" 
            className="w-full h-full object-contain opacity-20"
            onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<span style="font-size: 4rem; opacity: 0.2;">🎮</span>';
            }}
        />
    </div>
);

const MonopolyBoard = ({ players, playerPositions, totalSteps, user }) => {
    const calculateGrid = (steps) => {
        const perimeter = steps;
        const y = Math.max(3, Math.round(perimeter / 5.6)); 
        const x = Math.floor((perimeter - 2 * y) / 2);
        const realX = (perimeter / 2) - y;
        return { x: realX, y: y };
    };

    const gridConfig = calculateGrid(totalSteps);
    const CELLS_X = gridConfig.x;
    const CELLS_Y = gridConfig.y;

    const BOARD_W = 1200;
    const BOARD_H = 700;
    const PADDING = 60; 
    
    const RECT_W = BOARD_W - PADDING * 2;
    const RECT_H = BOARD_H - PADDING * 2;

    const stepSizeX = RECT_W / CELLS_X;
    const stepSizeY = RECT_H / CELLS_Y;

    const getStepCoords = (index) => {
        const safeIndex = Math.min(index, totalSteps); 
        let x = 0, y = 0;

        if (safeIndex <= CELLS_X) {
            x = PADDING + (safeIndex * stepSizeX);
            y = PADDING;
        } else if (safeIndex <= CELLS_X + CELLS_Y) {
            x = PADDING + RECT_W;
            y = PADDING + ((safeIndex - CELLS_X) * stepSizeY);
        } else if (safeIndex <= 2 * CELLS_X + CELLS_Y) {
            x = PADDING + RECT_W - ((safeIndex - (CELLS_X + CELLS_Y)) * stepSizeX);
            y = PADDING + RECT_H;
        } else {
            x = PADDING;
            y = PADDING + RECT_H - ((safeIndex - (2 * CELLS_X + CELLS_Y)) * stepSizeY);
        }
        return { x, y };
    };

    const getAvatarOffset = (index, count) => {
        if (count <= 1) return { x: 0, y: 0 };
        const dist = 14; 
        if (index === 0) return { x: -dist, y: -dist }; 
        if (index === 1) return { x: dist, y: -dist };  
        if (index === 2) return { x: -dist, y: dist };  
        return { x: dist, y: dist };                    
    };

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <svg width="100%" height="100%" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} preserveAspectRatio="none" className="opacity-100">
                <rect x={PADDING} y={PADDING} width={RECT_W} height={RECT_H} fill="none" stroke="#e2e8f0" strokeWidth="4" rx="20" strokeDasharray="10 10" />

                {Array.from({ length: totalSteps + 1 }).map((_, i) => {
                    const { x, y } = getStepCoords(i);
                    const isStart = i === 0;
                    const isEnd = i === totalSteps;
                    const boxSize = 50; 

                    return (
                        <g key={i}>
                            <rect 
                                x={x - boxSize/2} y={y - boxSize/2} 
                                width={boxSize} height={boxSize} 
                                rx="10"
                                fill={isStart ? '#ecfdf5' : isEnd ? '#fff1f2' : 'white'} 
                                stroke={isStart ? '#10b981' : isEnd ? '#f43f5e' : '#cbd5e1'} 
                                strokeWidth={isStart || isEnd ? 3 : 2}
                                className="drop-shadow-sm"
                            />
                            {!isStart && !isEnd && <text x={x} y={y + 5} fontSize="14" textAnchor="middle" fill="#94a3b8" fontWeight="bold" opacity="0.4">{i}</text>}
                            {isEnd && <text x={x} y={y + 8} fontSize="24" textAnchor="middle">🏁</text>}
                            {isStart && <text x={x} y={y + 4} fontSize="10" fontWeight="900" textAnchor="middle" fill="#059669">START</text>}
                        </g>
                    );
                })}

                {players.map((p) => {
                    const pId = p.user_id || p.id;
                    const isMe = String(pId) === String(user.id);
                    const currentPos = playerPositions[pId] || 0;
                    const { x, y } = getStepCoords(currentPos);
                    
                    const samePosPlayers = players.filter(pl => (playerPositions[pl.user_id || pl.id] || 0) === currentPos);
                    samePosPlayers.sort((a, b) => (a.user_id || a.id).toString().localeCompare((b.user_id || b.id).toString()));
                    const myIndex = samePosPlayers.findIndex(pl => (pl.user_id || pl.id) === pId);
                    const offset = getAvatarOffset(myIndex, samePosPlayers.length);
                    
                    const color = isMe ? '#4338ca' : '#94a3b8'; 
                    const zIdx = isMe ? 50 : 10;

                    return (
                        <g key={pId} className="runner-move" transform={`translate(${x + offset.x}, ${y + offset.y})`}>
                            <foreignObject x="-20" y="-20" width="40" height="40" style={{ overflow: 'visible' }}>
                                <div className="flex items-center justify-center relative">
                                    <div className={`w-10 h-10 rounded-full border-[3px] shadow-md overflow-hidden bg-white transition-transform duration-300 ${isMe ? 'scale-125 z-50 ring-4 ring-indigo-200' : 'opacity-80 z-10 grayscale-[0.5]'}`} style={{ borderColor: color, zIndex: zIdx }}>
                                        <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-full h-full object-cover" alt="" />
                                    </div>
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const KanjiRacePage = () => {
    const { user } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { matchId, players, isHost, config } = location.state || {};

    const { 
        gameState, myPos, playerPositions, currentQuestion, 
        feedback, answerReveal, stunCountdown, 
        resultMsg, gameResult, winner, TRACK_LENGTH, 
        handleAnswer, confirmQuit 
    } = useRaceGame(matchId, players, isHost, user, config);

    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        setInputValue("");
        if (currentQuestion && !currentQuestion.isMCQ && !feedback && !answerReveal && stunCountdown === 0) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [currentQuestion, feedback, answerReveal, stunCountdown]);

    if (!matchId || !players) return <Navigate to="/arena" replace />;

    return (
        <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col items-center justify-center font-sans overflow-hidden relative select-none">
            <style>{styles}</style>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <RealControllerIcon className="absolute top-20 left-20 w-32 h-32 animate-float" />
                <RealControllerIcon className="absolute bottom-20 right-20 w-40 h-40 animate-float" style={{ animationDelay: '1s' }} />
                <RealControllerIcon className="absolute top-10 right-40 w-24 h-24 animate-float" style={{ animationDelay: '2s', transform: 'rotate(15deg)' }} />
                <RealControllerIcon className="absolute bottom-10 left-40 w-28 h-28 animate-float" style={{ animationDelay: '3s', transform: 'rotate(-15deg)' }} />
            </div>

            <div className="relative w-full h-full p-4 md:p-8 flex items-center justify-center">
                
                {/* 1. BÀN CỜ */}
                {gameState === 'RACING' && (
                    <MonopolyBoard 
                        players={players} 
                        playerPositions={playerPositions} 
                        totalSteps={TRACK_LENGTH} 
                        user={user}
                    />
                )}

                {/* 2. KHUNG CÂU HỎI */}
                <div className="relative z-10 w-full flex items-center justify-center">
                    {/* Nút đầu hàng bên trái */}
                    {gameState === 'RACING' && (
                        <button onClick={confirmQuit} className="absolute left-40 px-6 py-3 bg-white/90 hover:bg-red-50 border-2 border-slate-300 hover:border-red-400 rounded-2xl text-sm font-black text-slate-600 hover:text-red-600 uppercase tracking-wide transition-all shadow-lg hover:shadow-xl backdrop-blur-sm whitespace-nowrap">
                            🏳️ Đầu hàng
                        </button>
                    )}
                    
                    <div className="w-full max-w-2xl flex flex-col items-center">
                        {gameState === 'RACING' && currentQuestion ? (
                        <div className={`w-full transition-all duration-200 ${feedback === 'WRONG' ? 'animate-shake' : ''}`}>
                            
                            <div className={`w-full bg-white rounded-[3rem] shadow-2xl border-[4px] relative overflow-hidden flex flex-col items-center py-8 px-6 transition-all duration-200
                                ${feedback === 'CORRECT' ? 'border-green-400 shadow-green-100' : 
                                  feedback === 'WRONG' ? 'border-red-400 shadow-red-100' : 
                                  'border-white shadow-slate-200'}`}
                                style={{ minHeight: '420px' }}
                            >
                                <div className="flex-1 flex flex-col items-center justify-center w-full mb-4 relative mt-4">
                                    {(answerReveal || feedback) && (
                                        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-black text-white text-center shadow-lg animate-slide-down z-30 text-xs uppercase tracking-wide whitespace-nowrap
                                            ${answerReveal ? 'bg-orange-500' : feedback === 'CORRECT' ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {answerReveal ? 
                                                'SAI 2 LẦN: LÙI 1 BƯỚC' : 
                                                feedback === 'CORRECT' ? "CHÍNH XÁC (+1)" : 
                                                `SAI RỒI! (${stunCountdown}s)`
                                            }
                                        </div>
                                    )}

                                    <h1 className="text-[8rem] md:text-[10rem] font-black text-slate-800 font-kanji leading-none select-none mb-3 mt-2">
                                        {currentQuestion.question}
                                    </h1>
                                    
                                    <div className={`text-base font-black uppercase tracking-widest px-8 py-3 rounded-2xl shadow-md
                                        ${currentQuestion.askMode === 'READING' 
                                            ? 'text-blue-700 bg-blue-50 border-2 border-blue-200' 
                                            : 'text-green-700 bg-green-50 border-2 border-green-200'}`}>
                                        {currentQuestion.askMode === 'READING' ? "HIRAGANA ?" : "HÁN VIỆT / NGHĨA ?"}
                                    </div>

                                    {answerReveal && typeof answerReveal === 'object' && (
                                        <div className="mt-4 w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-left shadow-sm">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ĐÁP ÁN CHUẨN</div>
                                            {answerReveal.askMode === 'MEANING' && answerReveal.detail && (
                                                <div className="space-y-1 text-sm font-semibold text-slate-700">
                                                    <div>
                                                        <span className="text-slate-400">Hán Việt:</span>{' '}
                                                        <span>{answerReveal.detail.hanviet || '—'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400">Nghĩa Việt:</span>{' '}
                                                        <span>{(answerReveal.detail.mean || []).join(' / ') || '—'}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {answerReveal.askMode === 'READING' && answerReveal.detail && (
                                                <div className="space-y-1 text-sm font-semibold text-slate-700">
                                                    <div>
                                                        <span className="text-slate-400">Âm Kun:</span>{' '}
                                                        <span>{(answerReveal.detail.kun || [answerReveal.detail.kana]).filter(Boolean).join(' / ') || '—'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400">Âm On:</span>{' '}
                                                        <span>{(answerReveal.detail.on || []).join(' / ') || '—'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="w-full max-w-lg mt-auto">
                                    {currentQuestion.isMCQ ? (
                                        <div className="grid grid-cols-2 gap-3 h-24">
                                            {currentQuestion.options.map((opt, i) => (
                                                <button key={i} disabled={stunCountdown > 0 || answerReveal} onClick={() => handleAnswer(opt)}
                                                    className="bg-white border-2 border-slate-200 rounded-2xl font-bold text-lg text-slate-600 
                                                    hover:border-blue-500 hover:text-blue-600 active:scale-95 transition-all 
                                                    disabled:opacity-50 flex items-center justify-center shadow-sm uppercase">
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <form onSubmit={e => { e.preventDefault(); handleAnswer(inputValue); }} className="flex gap-3 w-full h-14 items-center">
                                            <input 
                                                ref={inputRef} 
                                                value={inputValue} 
                                                onChange={(e) => setInputValue(e.target.value)} 
                                                disabled={stunCountdown > 0 || answerReveal}
                                                className={`flex-1 h-full text-center text-xl font-bold rounded-[20px] border-[2px] outline-none transition-all placeholder:text-slate-300 px-4
                                                    ${feedback === 'WRONG' ? 'border-red-400 bg-red-50 text-red-600' : 
                                                      feedback === 'CORRECT' ? 'border-green-400 bg-green-50 text-green-600' :
                                                      'border-indigo-100 focus:border-indigo-400 bg-white text-slate-800'}`} 
                                                placeholder={currentQuestion.askMode === 'READING' ? "Gõ Romaji..." : "Nhập nghĩa..."}
                                            />
                                            
                                            <button type="submit" disabled={stunCountdown > 0 || answerReveal} 
                                                className="w-14 h-14 bg-[#0f172a] text-white rounded-[20px] shadow-lg hover:bg-black active:scale-90 transition-all 
                                                flex items-center justify-center shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                </svg>
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center animate-pulse gap-6 mt-20">
                            <div className="w-14 h-14 border-[5px] border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="text-sm font-black text-slate-400 uppercase tracking-widest">ĐANG TẢI...</div>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* RESULT OVERLAY */}
            {gameState === 'FINISHED' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-fade-in p-6">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-[4px] border-slate-100 text-center w-full max-w-sm transform scale-100 hover:scale-105 transition-transform duration-500">
                        <div className="text-7xl mb-6 animate-bounce">{gameResult === 'WIN' ? '🏆' : '🐢'}</div>
                        <h2 className={`text-4xl font-black mb-4 uppercase ${gameResult === 'WIN' ? 'text-green-600' : 'text-slate-500'}`}>
                            {gameResult === 'WIN' ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
                        </h2>
                        {gameResult === 'LOSE' && winner && (
                            <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NGƯỜI THẮNG</div>
                                <div className="flex items-center justify-center gap-3">
                                    <img src={winner.avatar || `https://ui-avatars.com/api/?name=${winner.full_name}`} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt=""/>
                                    <div className="text-xl font-black text-slate-800">{winner.full_name}</div>
                                </div>
                            </div>
                        )}
                        <p className="mb-6 text-sm text-slate-400 font-bold uppercase">{resultMsg}</p>
                        
                        {/* [FIX 2] Điều hướng về ArenaLobbyPage */}
                        <button onClick={() => navigate('/arena/lobby')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">
                            QUAY VỀ SẢNH
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanjiRacePage;