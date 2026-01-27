import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const useArenaPrep = (matchId, players, isHost, user) => {
    const navigate = useNavigate();
    
    const [lessonNum, setLessonNum] = useState(1);
    const [isSpinning, setIsSpinning] = useState(false);
    const [statusText, setStatusText] = useState("ĐANG KẾT NỐI...");
    const [finalLesson, setFinalLesson] = useState(null);
    const channelRef = useRef(null);

    // Validation
    useEffect(() => {
        if (!matchId || !players) {
            navigate('/arena', { replace: true });
        }
    }, [matchId, players, navigate]);

    // Realtime Logic
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase.channel(`prep_${matchId}`);

        channel
            .on('broadcast', { event: 'SPIN_START' }, ({ payload }) => {
                startSpinAnimation(payload.targetLesson);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    if (isHost) {
                        setStatusText("CHỦ PHÒNG ĐANG CHỌN...");
                        // Wait 2.5s for everyone to arrive
                        setTimeout(() => {
                            const randomLesson = Math.floor(Math.random() * 32) + 1;
                            
                            channel.send({ 
                                type: 'broadcast', 
                                event: 'SPIN_START', 
                                payload: { targetLesson: randomLesson } 
                            });
                            
                            startSpinAnimation(randomLesson);
                        }, 2500);
                    } else {
                        setStatusText("ĐỢI QUAY SỐ...");
                    }
                }
            });

        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, [matchId, isHost]);

    // Spin Animation Logic
    const startSpinAnimation = (target) => {
        setIsSpinning(true);
        setStatusText("ĐANG QUAY NGẪU NHIÊN...");
        
        let counter = 0;
        const totalSpins = 30; 
        const speed = 80;

        const interval = setInterval(() => {
            setLessonNum(Math.floor(Math.random() * 32) + 1);
            counter++;

            if (counter >= totalSpins) {
                clearInterval(interval);
                setLessonNum(target);
                setIsSpinning(false);
                setFinalLesson(target);
                setStatusText(`CHỦ ĐỀ: BÀI ${target}`);
                
                setTimeout(() => goToGame(target), 2000);
            }
        }, speed);
    };

    const goToGame = (lessonId) => {
        const gameConfig = {
            lesson: lessonId,
            questionCount: 20, 
            checkMeaning: true,
            checkReading: true,
            enableWriting: true,
            timeMode: 'normal'
        };

        navigate('/arena/play', { 
            state: { 
                matchId, 
                players, 
                isHost, 
                config: gameConfig 
            } 
        });
    };

    return {
        lessonNum,
        isSpinning,
        statusText,
        finalLesson
    };
};