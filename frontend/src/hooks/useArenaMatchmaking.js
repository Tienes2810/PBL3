import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const useArenaMatchmaking = (user, currentRankObj, onMatchFound) => {
    const [status, setStatus] = useState('IDLE'); 
    const [onlineCount, setOnlineCount] = useState(0);
    const [desiredPlayers, setDesiredPlayers] = useState(2); 
    
    const currentRoomIdRef = useRef(null);
    const channelRef = useRef(null);

    // Hàm gọi SQL RPC để vào phòng an toàn
    const startFinding = async () => {
        if (status === 'FINDING') return;
        setStatus('FINDING');
        setOnlineCount(1); // Ít nhất là có mình

        try {
            const myData = {
                id: user.id, // ID số nguyên từ bảng users (6, 22, v.v.)
                full_name: user.full_name,
                avatar: user.avatar,
                rankIcon: currentRankObj.img,
                rankName: currentRankObj.name,
                rankColor: currentRankObj.color
            };

            // 🔥 GỌI HÀM SQL ATOMIC
            const { data, error } = await supabase.rpc('join_match_queue', {
                p_mode: desiredPlayers,
                p_player_data: myData
            });

            if (error) throw error;

            console.log("✅ RPC Response:", data);
            
            // Xác định cột và giá trị ID từ response
            let roomId, idColumn;
            if (data?.match_id) {
                // RPC trả match_id = UUID từ cột 'id' trong DB
                roomId = data.match_id;
                idColumn = 'id'; // ✅ Query bằng cột id
            } else if (data?.match_identifier) {
                roomId = data.match_identifier;
                idColumn = 'match_identifier';
            } else if (data?.id) {
                roomId = data.id;
                idColumn = 'id';
            } else {
                console.error("❌ No valid room ID found in response");
                setStatus('IDLE');
                alert("Lỗi: Không nhận được ID phòng từ server!");
                return;
            }
            
            console.log("🔑 Room ID:", roomId, "| Query column:", idColumn);
            currentRoomIdRef.current = { roomId, idColumn };

            // Nếu hàm trả về found ngay lập tức (người cuối cùng vào)
            if (data.status === 'found') {
                // Đợi 1 chút để DB sync cho các client khác rồi lấy data full
                subscribeToRoom(roomId, idColumn); 
            } else {
                // Nếu chưa đủ người, lắng nghe tiếp
                subscribeToRoom(roomId, idColumn);
            }

        } catch (error) {
            console.error("Lỗi tìm trận:", error);
            setStatus('IDLE');
            alert("Lỗi kết nối server tìm trận!");
        }
    };

    const subscribeToRoom = (roomId, filterCol) => {
        console.log(`📡 Subscribing to room: ${roomId} | Filter: ${filterCol}=eq.${roomId}`);
        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const channel = supabase.channel(`room_${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches', filter: `${filterCol}=eq.${roomId}` },
                (payload) => {
                    const newRoom = payload.new;
                    console.log("🔄 DB UPDATE received:", { status: newRoom.status, playerCount: newRoom.players?.length });
                    // Cập nhật số người hiển thị
                    if (newRoom.players) {
                        setOnlineCount(newRoom.players.length);
                        console.log(`👥 Players in room: ${newRoom.players.length}/${desiredPlayers}`);
                    }

                    // 🔥 KHI ĐỦ NGƯỜI (DB BÁO FOUND)
                    if (newRoom.status === 'found') {
                        console.log("✅ MATCH FOUND! Players:", newRoom.players);
                        setStatus('MATCHED');
                        
                        // Cleanup
                        channel.unsubscribe();
                        channelRef.current = null;
                        
                        // Xác định Host (người đầu tiên trong mảng)
                        // Lưu ý: ID user ở đây là dạng số (6, 22) nên so sánh lỏng (==) hoặc ép kiểu
                        const isHost = newRoom.players[0].id == user.id; 

                        // Chuyển trang
                        setTimeout(() => {
                            onMatchFound({
                                matchId: newRoom.match_identifier, // ID dùng để sync game
                                players: newRoom.players,
                                isHost: isHost
                            });
                        }, 1000);
                    }
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("✅ Channel subscribed successfully");
                    // Fetch lại dữ liệu phòng lần đầu để cập nhật UI ngay lập tức
                    const { data, error } = await supabase.from('matches').select('*').eq(filterCol, roomId).single();
                    if (error) console.error("❌ Error fetching room data:", error);
                    console.log("📊 Initial room data:", data);
                    if (data) {
                        setOnlineCount(data.players.length);
                        if (data.status === 'found') {
                             // Case đặc biệt: Nếu mình là người cuối và DB đã found ngay lúc mình vào
                             setStatus('MATCHED');
                             const isHost = data.players[0].id == user.id;
                             setTimeout(() => {
                                onMatchFound({
                                    matchId: data.match_identifier,
                                    players: data.players,
                                    isHost: isHost
                                });
                            }, 1000);
                        }
                    }
                }
            });

        channelRef.current = channel;
    };

    const cancelFinding = async () => {
        try {
            // Nếu đang trong phòng, xóa dữ liệu khỏi database
            if (currentRoomIdRef.current?.roomId) {
                const { roomId, idColumn } = currentRoomIdRef.current;
                
                // Lấy thông tin match hiện tại
                const { data: match, error: fetchError } = await supabase
                    .from('matches')
                    .select('*')
                    .eq(idColumn, roomId)
                    .single();

                if (!fetchError && match) {
                    // Xóa user khỏi mảng players
                    const updatedPlayers = match.players.filter(p => p.id !== user.id);
                    
                    if (updatedPlayers.length === 0) {
                        // Nếu không còn ai, xóa match
                        await supabase.from('matches').delete().eq(idColumn, roomId);
                        console.log("🗑️ Deleted empty match:", roomId);
                    } else {
                        // Nếu còn người, cập nhật lại match
                        await supabase
                            .from('matches')
                            .update({ 
                                players: updatedPlayers,
                                status: 'waiting' // Reset về trạng thái waiting
                            })
                            .eq(idColumn, roomId);
                        console.log("✅ Removed player from match:", roomId);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error canceling matchmaking:", error);
        } finally {
            // Cleanup UI state
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            setStatus('IDLE');
            setOnlineCount(0);
            currentRoomIdRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, []);

    return {
        status,
        onlineCount,
        desiredPlayers,
        setDesiredPlayers,
        startFinding,
        cancelFinding
    };
};