import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KanjiCanvas from '../components/KanjiCanvas';

// Import trực tiếp file JSON từ điển (chứa dữ liệu phân tích, bộ thủ...)
import dictionaryData from '../utils/kanji-dictionary.json'; 

const HomePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [candidates, setCandidates] = useState([]);
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Khởi tạo từ điển từ file JSON import bên trên
  const [dictionary] = useState(dictionaryData);

  // Kiểm tra đăng nhập
  const session = JSON.parse(localStorage.getItem('session'));
  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  // --- HÀM GỌI API GOOGLE (Chuẩn hóa dữ liệu) ---
  const recognizeKanji = async (trace, width, height) => {
    // Chuyển đổi format: [[x,y],...] -> [[x...], [y...], []]
    const formattedInk = trace.map(stroke => {
        const x = [];
        const y = [];
        stroke.forEach(point => {
            x.push(point[0]);
            y.push(point[1]);
        });
        return [x, y, []];
    });

    const body = {
        options: "enable_pre_space",
        requests: [{
            writing_guide: { writing_area_width: width, writing_area_height: height },
            ink: formattedInk,
            language: "zh" // Dùng tiếng Trung để chặn Hiragana và nhận diện hình dáng tốt hơn
        }]
    };

    try {
        const response = await fetch("https://www.google.com/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        // Cấu trúc trả về thành công của Google
        if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]) {
            return data[1][0][1];
        }
        return [];
    } catch (error) {
        console.error("Lỗi API:", error);
        return [];
    }
  };

  // --- HÀM XỬ LÝ KHI VẼ XONG ---
  const handleIdentify = async () => {
    if (!canvasRef.current || !canvasRef.current.getTrace) return;
    
    const trace = canvasRef.current.getTrace();
    // Lấy kích thước chuẩn từ Canvas (đã fix lỗi Retina)
    const dimensions = canvasRef.current.getDimensions ? canvasRef.current.getDimensions() : { width: 500, height: 500 };

    if (!trace || trace.length === 0) return;

    setIsAnalyzing(true);

    // Gọi API
    const results = await recognizeKanji(trace, dimensions.width, dimensions.height);
    
    if (results && results.length > 0) {
        // 1. Lọc chỉ lấy ký tự đơn (Bỏ từ ghép)
        const singleChars = results.filter(str => str.length === 1);

        // 2. Chỉ giữ lại Kanji (Bỏ số, dấu câu, Hiragana, Katakana...)
        const kanjiRegex = /^[\u4E00-\u9FAF]+$/;
        const cleanResults = singleChars.filter(char => kanjiRegex.test(char));

        // 3. Sắp xếp: Ưu tiên chữ có trong từ điển JSON của mình lên đầu
        cleanResults.sort((a, b) => {
            const aExists = dictionary.some(d => d.kanji === a);
            const bExists = dictionary.some(d => d.kanji === b);
            return bExists - aExists; 
        });

        // Fallback: Nếu lọc xong mà rỗng (vẽ bậy) thì lấy kết quả gốc để không bị trắng trơn
        const finalResults = cleanResults.length > 0 ? cleanResults : singleChars.slice(0, 5);

        // Map kết quả với dữ liệu từ điển
        const mappedCandidates = finalResults.slice(0, 6).map(char => {
            const found = dictionary.find(item => item.kanji === char);
            
            // Nếu tìm thấy trong JSON, lấy đầy đủ thông tin (radical, strokes...)
            // Nếu không, tạo object mặc định
            return found || { 
                kanji: char, 
                hanviet: "---", 
                mean: "Chưa có trong dữ liệu",
                onyomi: "---",
                kunyomi: "---",
                radical: "---",
                strokes: null,
                formation: "---",
                detail: "Chưa có dữ liệu phân tích cho chữ này."
            };
        });

        setCandidates(mappedCandidates);
        if (mappedCandidates.length > 0) {
            setSelectedKanji(mappedCandidates[0]);
        }
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR (CỘT TRÁI) */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col shadow-sm z-10">
        <h2 className="text-3xl font-black italic mb-10 tracking-tighter">Dojo</h2>
        <nav className="flex-1 space-y-3 font-bold text-gray-400">
          <div className="text-black bg-gray-100 p-3 rounded-xl cursor-pointer flex items-center gap-3"><span>✍️</span> Tra cứu viết tay</div>
          <div className="hover:text-black p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer flex items-center gap-3"><span>🤖</span> AI Chatbot</div>
          <div className="hover:text-black p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer flex items-center gap-3"><span>📖</span> Từ điển</div>
        </nav>
        <button onClick={() => { localStorage.removeItem('session'); navigate('/auth'); }} className="text-xs font-black text-gray-300 uppercase hover:text-red-500 pl-3 tracking-widest">LOGOUT</button>
      </aside>

      {/* MAIN CONTENT (KHU VỰC CHÍNH) */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 h-full overflow-y-auto">
        
        {/* CỘT GIỮA: VẼ KANJI */}
        <div className="col-span-7 bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 flex flex-col h-full max-h-[90vh]">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Khu vực vẽ</h3>
            <button onClick={() => { if(canvasRef.current.undo) canvasRef.current.undo(); }} className="text-xs font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg transition-colors">Hoàn tác ↩</button>
          </div>
          
          <div className="flex-1 bg-[#F8F9FA] rounded-[1.5rem] border-2 border-dashed border-gray-200 overflow-hidden mb-6 relative cursor-crosshair">
            <KanjiCanvas ref={canvasRef} onStrokeEnd={handleIdentify} />
          </div>

          {/* THANH GỢI Ý KẾT QUẢ */}
          <div className="flex gap-3 justify-center mb-4 min-h-[64px] px-4 overflow-x-auto py-2">
            {candidates.length > 0 ? (
                candidates.map((item, index) => (
                <button key={index} onClick={() => setSelectedKanji(item)} className={`flex-shrink-0 w-14 h-14 rounded-xl text-2xl font-serif font-bold transition-all border-2 ${selectedKanji?.kanji === item.kanji ? 'bg-black text-white border-black scale-110 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>{item.kanji}</button>
                ))
            ) : (
                <div className="text-xs text-gray-400 font-bold flex items-center h-14">
                    {isAnalyzing ? "Đang phân tích..." : "Hãy vẽ chữ vào khung bên trên"}
                </div>
            )}
          </div>

          <div className="flex justify-center">
            <button onClick={() => { canvasRef.current.clear(); setCandidates([]); setSelectedKanji(null); }} className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 hover:text-gray-800 transition-all active:scale-[0.98]">XÓA BẢNG VẼ</button>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT KẾT QUẢ */}
        <div className="col-span-5 flex flex-col gap-6 h-full">
            {/* THẺ TRÊN: THÔNG TIN CƠ BẢN */}
            <div className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-8 flex flex-col items-center relative overflow-hidden flex-1">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
                
                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Chữ Kanji lớn */}
                    <div className="w-28 h-28 bg-black text-white rounded-[1.5rem] flex items-center justify-center text-6xl font-serif font-medium mb-4 shadow-2xl">
                        {selectedKanji?.kanji || "?"}
                    </div>
                    
                    {/* Hán Việt */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded uppercase">Hán Việt</span>
                    </div>
                    <h3 className="text-3xl font-black mb-6 text-gray-800 text-center uppercase">
                        {selectedKanji?.hanviet || "---"}
                    </h3>

                    {/* Âm On/Kun */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Âm Onyomi</p>
                            <p className="font-bold text-gray-700 text-sm">{selectedKanji?.onyomi || "---"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Âm Kunyomi</p>
                            <p className="font-bold text-gray-700 text-sm">{selectedKanji?.kunyomi || "---"}</p>
                        </div>
                    </div>
                    
                    <div className="w-full border-t border-gray-100 mb-6"></div>

                    {/* Ý nghĩa */}
                    <div className="w-full text-center mb-6">
                        <p className="text-gray-300 font-bold uppercase text-[10px] tracking-widest mb-2">Ý nghĩa</p>
                        <p className="text-lg font-bold text-gray-700 leading-snug">
                            {selectedKanji?.mean || "Kết quả sẽ hiện ra ngay khi bạn vẽ."}
                        </p>
                    </div>
                </div>
            </div>

            {/* THẺ DƯỚI: PHÂN TÍCH CHUYÊN SÂU (ĐÃ CẬP NHẬT) */}
            <div className="bg-blue-50/50 rounded-[2rem] border border-blue-100 p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">💡</span>
                    <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Phân tích chuyên sâu</h4>
                </div>
                
                {/* Grid hiển thị Bộ thủ - Số nét - Cấu tạo */}
                <div className="flex gap-4">
                    <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm">
                        <span className="text-[10px] text-gray-400 font-black uppercase block">Bộ thủ</span>
                        <span className="text-blue-700 font-bold text-sm">
                            {selectedKanji?.radical || "---"}
                        </span>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm">
                        <span className="text-[10px] text-gray-400 font-black uppercase block">Số nét</span>
                        <span className="text-blue-700 font-bold text-sm">
                            {selectedKanji?.strokes ? `${selectedKanji.strokes} nét` : "---"}
                        </span>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm flex-1">
                        <span className="text-[10px] text-gray-400 font-black uppercase block">Cấu tạo</span>
                        <span className="text-blue-700 font-bold text-sm">
                            {selectedKanji?.formation || "---"}
                        </span>
                    </div>
                </div>

                {/* Câu chuyện ghi nhớ */}
                <div className="mt-2">
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Câu chuyện ghi nhớ</p>
                    <p className="text-sm text-blue-800/90 font-medium leading-relaxed italic">
                        "{selectedKanji?.detail || "Thông tin nguồn gốc sẽ hiện tại đây."}"
                    </p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;