import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import * as wanakana from 'wanakana';
import kanjiBase from '../utils/kanji-base.json';
import jukugoData from '../utils/jukugo-data.json';

export const useRaceGame = (matchId, players, isHost, user, config) => {
    const navigate = useNavigate();
    const TRACK_LENGTH = config?.questionCount || 20;

    const getPlayerId = (value) => String(value?.user_id ?? value?.id ?? value ?? '').toLowerCase();

    // --- STATE ---
    const [gameState, setGameState] = useState('LOADING'); 
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [playerPositions, setPlayerPositions] = useState({});
    
    // Danh sách ID người chơi đang Online (Realtime)
    const [activePlayerIds, setActivePlayerIds] = useState([]);

    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const [answerReveal, setAnswerReveal] = useState(null); 
    const [feedback, setFeedback] = useState(null); 
    const [stunCountdown, setStunCountdown] = useState(0); 
    const [gameResult, setGameResult] = useState(null); 
    const [resultMsg, setResultMsg] = useState("");
    const [winner, setWinner] = useState(null);

    const channelRef = useRef(null);
    const hasUpdatedPoints = useRef(false);
    const isProcessingRef = useRef(false);
    const questionPoolRef = useRef([]);
    const playersRef = useRef(players || []);
    const questionIndexRef = useRef(0); // Track câu hỏi hiện tại
    const gameStateRef = useRef(gameState); // Track gameState để dùng trong cleanup

    // Sync gameState vào ref
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // 1. INIT: Tạo danh sách active ban đầu
    useEffect(() => {
        if (players && players.length > 0) {
            playersRef.current = players;
            
            const initialPos = {};
            const initialActiveIds = [];
            players.forEach(p => { 
                const pid = getPlayerId(p); // Chuẩn hóa ID
                initialPos[pid] = 0; 
                initialActiveIds.push(pid);
            });
            console.log("🏁 Initial players:", initialActiveIds);
            setPlayerPositions(prev => Object.keys(prev).length === 0 ? initialPos : prev);
            // Mặc định ban đầu coi như tất cả đều active
            setActivePlayerIds(prev => prev.length === 0 ? initialActiveIds : prev);
        }
    }, [players]);

    // 2. CONNECTION & LOGIC
    useEffect(() => {
        if (!matchId) return;

        // Load Questions - Giống logic ChallengePage.jsx
        const targetLesson = config?.lesson || 1;
        const ITEMS_PER_LESSON = 16;
        
        // 🎯 FIX: Lấy đúng theo lesson như ChallengePage
        // Kanji: Lấy theo index (slice)
        const startIndex = (targetLesson - 1) * ITEMS_PER_LESSON;
        const endIndex = startIndex + ITEMS_PER_LESSON;
        const list1 = (kanjiBase || []).slice(startIndex, endIndex).map(i => ({ ...i, type: 'kanji' }));
        
        // Jukugo: Filter theo lesson number
        const list2 = (jukugoData || []).filter(i => i.lesson === targetLesson).map(i => ({ ...i, type: 'jukugo' }));
        
        let combined = [...list1, ...list2];
        console.log(`📚 Lesson ${targetLesson}: ${list1.length} kanji + ${list2.length} jukugo = ${combined.length} items`);
        
        if (combined.length < 5) {
             console.warn(`⚠️ Lesson ${targetLesson} has < 5 items, using fallback`);
             const fallback = (kanjiBase || []).slice(0, 50).map(i => ({...i, type:'kanji'}));
             combined = [...combined, ...fallback];
        }
        
        // Shuffle toàn bộ và chỉ lấy đúng số câu cần
        const shuffled = combined.sort(() => 0.5 - Math.random());
        questionPoolRef.current = shuffled.slice(0, TRACK_LENGTH);
        console.log(`🎲 Selected ${questionPoolRef.current.length}/${TRACK_LENGTH} questions for race`);
        generateNextQuestion();

        // Supabase Channel
        const channel = supabase.channel(matchId, { config: { presence: { key: user.id } } });

        channel
            .on('broadcast', { event: 'RACE_START' }, () => setGameState('RACING'))
            .on('broadcast', { event: 'CHECK_STATUS' }, () => {
                if (isHost) channel.send({ type: 'broadcast', event: 'RACE_START' });
            })
            .on('broadcast', { event: 'UPDATE_POS' }, ({ payload }) => {
                const uid = getPlayerId(payload?.userId);
                setPlayerPositions(prev => ({ ...prev, [uid]: payload.position }));
                if (payload.position >= TRACK_LENGTH) {
                    const winnerInfo = playersRef.current.find(p => getPlayerId(p) === uid);
                    handleGameOver(uid === String(user.id).toLowerCase(), `Người chiến thắng: ${winnerInfo?.full_name || 'Đối thủ'}`, winnerInfo);
                }
            })
            // Xử lý người chơi thoát - chỉ remove khỏi UI
            .on('broadcast', { event: 'PLAYER_LEFT' }, ({ payload }) => {
                const leftId = getPlayerId(payload?.userId);
                const myId = getPlayerId(user?.id);
                if (leftId && leftId !== myId) {
                    console.log("🚪 Player left (UI only):", leftId);
                    removePlayerFromActive(leftId);
                }
            })
            // [FIX 1 - PRESENCE] Xử lý sự kiện thoát do mất mạng/tắt tab
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                if (leftPresences) {
                    leftPresences.forEach(p => {
                        const presenceId = p?.user_id ?? p?.key ?? p?.userId;
                        if (presenceId) removePlayerFromActive(getPlayerId(presenceId));
                    });
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track presence để hệ thống biết mình đang online
                    await channel.track({ online_at: new Date().toISOString(), user_id: user.id });

                    if (isHost) {
                        setTimeout(() => {
                            channel.send({ type: 'broadcast', event: 'RACE_START' });
                            setGameState('RACING');
                        }, 500);
                    } else {
                        channel.send({ type: 'broadcast', event: 'CHECK_STATUS' });
                        setTimeout(() => {
                            setGameState(prev => prev === 'LOADING' ? 'RACING' : prev);
                        }, 2500);
                    }
                }
            });

        channelRef.current = channel;

        // 🔒 Cleanup: Xử lý khi component unmount
        return () => {
            // 🚨 CRITICAL: Nếu đang racing và chưa cập nhật điểm → tức là thoát giữa chừng
            if (gameStateRef.current === 'RACING' && !hasUpdatedPoints.current) {
                console.log("⚠️ Player left during race - deducting 5 points");
                hasUpdatedPoints.current = true;
                
                // Trừ điểm ngay lập tức (đồng bộ)
                supabase.from('users').select('rank_points').eq('id', user.id).single()
                    .then(({ data }) => {
                        if (data) {
                            const newPoints = Math.max(0, (data.rank_points || 0) - 5);
                            return supabase.from('users').update({ rank_points: newPoints }).eq('id', user.id);
                        }
                    })
                    .catch(err => console.error("❌ Lỗi trừ điểm:", err));
            }
            
            // Gửi broadcast và cleanup channel
            if(channelRef.current) { 
                channelRef.current.send({ type: 'broadcast', event: 'PLAYER_LEFT', payload: { userId: user.id } }).catch(()=>{});
                channelRef.current.untrack().catch(()=>{}); 
                supabase.removeChannel(channelRef.current); 
            } 
        };
    }, []);

    // Helper: Loại bỏ người chơi khỏi danh sách active
    const removePlayerFromActive = (leftId) => {
        if (!leftId) {
            console.warn("⚠️ removePlayerFromActive called with empty ID");
            return;
        }
        
        const myId = getPlayerId(user?.id);
        
        // ✅ CHECK TRƯỚC KHI UPDATE STATE
        setActivePlayerIds(prev => {
            if (!prev.includes(leftId)) {
                console.warn("⚠️ Player", leftId, "not in active list:", prev);
                return prev;
            }
            
            // ⚠️ BẢO VỆ: Không được remove chính mình qua broadcast người khác
            if (leftId === myId) {
                console.error("❌ BLOCKED: Attempted to remove myself via broadcast!");
                return prev;
            }
            
            const newList = prev.filter(id => id !== leftId);
            const othersInList = newList.filter(id => id !== myId);
            console.log("🚪 Player Left:", leftId, "| Remaining:", newList.length, "| Others:", othersInList.length, `(Total: ${playersRef.current.length})`); 
            
            // ⚠️ KHÔNG CHECK THẮNG Ở ĐÂY - để backup useEffect xử lý
            
            return newList;
        });
    };

    // Countdown Timer (Giữ nguyên)
    useEffect(() => {
        let timer;
        if (stunCountdown > 0) {
            timer = setTimeout(() => setStunCountdown(p => p - 1), 1000);
        } else if (stunCountdown === 0 && feedback === 'WRONG') {
            setFeedback(null);
            isProcessingRef.current = false;
        }
        return () => clearTimeout(timer);
    }, [stunCountdown, feedback]);

    // Generate question theo thứ tự từ pool đã shuffle
    const generateNextQuestion = () => {
        const pool = questionPoolRef.current;
        if (!pool || pool.length === 0) return;
        
        // 🎯 Lấy câu theo index tuần tự (pool đã được shuffle sẵn)
        const item = pool[questionIndexRef.current % pool.length];
        questionIndexRef.current++;
        
        const isMCQ = Math.random() > 0.5;
        
        const modes = [];
        if (config?.checkMeaning) modes.push('MEANING');
        if (config?.checkReading) modes.push('READING');
        const askMode = modes.length > 0 ? modes[Math.floor(Math.random() * modes.length)] : 'MEANING';

        let q = { 
            id: Math.random().toString(36), 
            question: item.kanji || item.jukugo, 
            typeTag: item.type === 'kanji' ? 'HÁN TỰ' : 'TỪ VỰNG', 
            isMCQ, askMode, options: [], validAnswers: [], revealText: "", revealDetail: null 
        };

        if (q.askMode === 'READING') {
            if (item.type === 'kanji') {
                const clean = (str) => str ? str.split('(')[0].replace(/\./g, '').trim() : '';
                const ons = item.onyomi ? item.onyomi.split(',').map(clean) : [];
                const kuns = item.kunyomi ? item.kunyomi.split(',').map(clean) : [];
                const onsHira = ons.map(s => wanakana.toHiragana(s));
                const kunsHira = kuns.map(s => wanakana.toHiragana(s));
                q.validAnswers = [...new Set([...ons, ...onsHira, ...kuns, ...kunsHira])].filter(Boolean);
                const kunText = kunsHira.filter(Boolean).join(' / ');
                const onText = onsHira.filter(Boolean).join(' / ');
                q.displayCorrect = [kunText, onText].filter(Boolean).join(' / ');
                q.revealText = `Âm Kun / Âm On: ${[kunText, onText].filter(Boolean).join(' / ')}`;
                q.revealDetail = { kind: 'READING', on: onsHira.filter(Boolean), kun: kunsHira.filter(Boolean) };
            } else {
                q.validAnswers = [item.hiragana];
                q.displayCorrect = item.hiragana;
                q.revealText = `Âm Kun / Âm On: ${item.hiragana}`;
                q.revealDetail = { kind: 'READING', kana: item.hiragana };
            }
        } else {
            const cleanMean = (str) => str ? str.trim().toLowerCase() : '';
            const means = item.mean ? item.mean.split(/[,;]/).map(cleanMean).filter(Boolean) : [];
            const hv = item.hanviet ? [item.hanviet.toLowerCase()] : [];
            q.validAnswers = [...means, ...hv].filter(Boolean);
            const mainMean = item.mean ? item.mean.split(/[,;]/)[0] : "";
            q.displayCorrect = item.hanviet ? `${item.hanviet} / ${mainMean}` : mainMean;
            q.revealText = `Hán Việt / Nghĩa Việt: ${item.hanviet ? `${item.hanviet} / ${mainMean}` : mainMean}`;
            q.revealDetail = { kind: 'MEANING', hanviet: item.hanviet || '', mean: item.mean ? item.mean.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [] };
        }

        if (q.isMCQ) {
            const distractors = pool.filter(k => (k.kanji||k.jukugo) !== q.question)
                .sort(() => 0.5 - Math.random()).slice(0, 3)
                .map(k => {
                    if (q.askMode === 'READING') {
                        if (k.type === 'kanji') {
                            const clean = (str) => str ? str.split('(')[0].replace(/\./g, '').trim() : '';
                            const on = k.onyomi ? wanakana.toHiragana(clean(k.onyomi.split(',')[0])) : "";
                            const kun = k.kunyomi ? clean(k.kunyomi.split(',')[0]) : "";
                            return [on, kun].filter(Boolean).join(' / ') || "xxx";
                        }
                        return k.hiragana || "xxx";
                    } else {
                        const mean = k.mean ? k.mean.split(/[,;]/)[0] : "xxx";
                        return k.hanviet ? `${k.hanviet} / ${mean}` : mean;
                    }
                });
            q.options = [...distractors, q.displayCorrect].sort(() => 0.5 - Math.random());
        }
        setCurrentQuestion(q);
    };

    // ... (Giữ nguyên handleAnswer)
    const handleAnswer = (val) => {
        if (isProcessingRef.current || gameState !== 'RACING' || stunCountdown > 0 || answerReveal) return;
        isProcessingRef.current = true;

        const userVal = val.toLowerCase().trim();
        const userValKana = wanakana.toHiragana(userVal); 
        let isCorrect = false;

        if (currentQuestion.isMCQ) {
            if (val === currentQuestion.displayCorrect) isCorrect = true;
        } else {
            isCorrect = currentQuestion.validAnswers.some(ans => {
                const a = ans.toLowerCase();
                return a === userVal || a === userValKana || userVal.includes(a);
            });
        }

        if (isCorrect) {
            setFeedback('CORRECT'); 
            setConsecutiveWrong(0);
            setTimeout(() => {
                const myId = getPlayerId(user?.id);
                const newPos = (playerPositions[myId] || 0) + 1;
                setPlayerPositions(prev => ({...prev, [myId]: newPos}));
                setFeedback(null);
                channelRef.current.send({ type: 'broadcast', event: 'UPDATE_POS', payload: { userId: user.id, position: newPos } });
                
                if (newPos >= TRACK_LENGTH) {
                    handleGameOver(true, "Về đích!", user);
                } else {
                    generateNextQuestion();
                }
                isProcessingRef.current = false;
            }, 500);
        } else {
            const newWrongCount = consecutiveWrong + 1; 
            setConsecutiveWrong(newWrongCount);
            if (newWrongCount >= 2) {
                setAnswerReveal({
                    text: currentQuestion.revealText || currentQuestion.displayCorrect || '',
                    detail: currentQuestion.revealDetail || null,
                    askMode: currentQuestion.askMode,
                    typeTag: currentQuestion.typeTag
                }); 
                setTimeout(() => {
                    const myId = getPlayerId(user?.id);
                    const newPos = Math.max(0, (playerPositions[myId] || 0) - 1); 
                    setPlayerPositions(prev => ({...prev, [myId]: newPos})); 
                    setConsecutiveWrong(0); 
                    setAnswerReveal(null); 
                    channelRef.current.send({ type: 'broadcast', event: 'UPDATE_POS', payload: { userId: user.id, position: newPos } }); 
                    generateNextQuestion();
                    isProcessingRef.current = false;
                }, 2500); 
            } else { 
                setFeedback('WRONG'); 
                setStunCountdown(5); 
            }
        }
    };

    const handleGameOver = async (isWin, msg, winnerUser) => {
        if (gameState === 'FINISHED') return;
        setGameState('FINISHED'); 
        setGameResult(isWin ? 'WIN' : 'LOSE'); 
        setResultMsg(msg); 
        setWinner(winnerUser);
        
        if (!hasUpdatedPoints.current) {
            hasUpdatedPoints.current = true;
            const pointsChange = isWin ? 20 : -5;
            supabase.from('users').select('rank_points').eq('id', user.id).single()
                .then(({ data }) => {
                    const newPoints = Math.max(0, (data?.rank_points || 0) + pointsChange);
                    return supabase.from('users').update({ rank_points: newPoints }).eq('id', user.id);
                })
                .catch(err => console.error("Lỗi cập nhật điểm:", err));
        }
    };

    // Nút đầu hàng: Chỉ làm người bấm thua ngay
    const confirmQuit = async () => {
        console.log("🏁 Player forfeited - immediate loss");
        if (channelRef.current) {
            // Vẫn gửi broadcast để remove khỏi UI của người khác
            await channelRef.current.send({ type: 'broadcast', event: 'PLAYER_LEFT', payload: { userId: user.id } }).catch(()=>{});
            await channelRef.current.untrack().catch(()=>{});
        }
        handleGameOver(false, "Đã đầu hàng!", null); 
    };

    return { 
        gameState, 
        myPos: playerPositions[getPlayerId(user?.id)] || 0, 
        playerPositions, 
        currentQuestion, 
        feedback, 
        answerReveal, 
        stunCountdown, 
        resultMsg, 
        gameResult, 
        winner, 
        TRACK_LENGTH, 
        handleAnswer, 
        confirmQuit 
    };
};