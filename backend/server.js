const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// KHÔNG DÙNG THƯ VIỆN GOOGLE (Dùng fetch trực tiếp để dễ control)
dotenv.config();
const app = express();

const corsOptions = {
    origin: [
        "http://localhost:2103",
        "http://localhost:5173",
        "https://kanjilearning.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 10000;

// ==========================================
// 1. KHO VŨ KHÍ: 3 KEYS CỦA BẠN
// (Bạn điền trực tiếp vào đây hoặc để trong .env: KEY1, KEY2...)
// ==========================================
const API_KEYS = [
    process.env.GEMINI_API_KEY_1, // Key 1
    process.env.GEMINI_API_KEY_2, // Key 2
    process.env.GEMINI_API_KEY_3, // Key 3
].filter(key => key); // Lọc bỏ key rỗng nếu chưa điền đủ

// Nếu không có key nào trong mảng trên, fallback về key mặc định cũ
if (API_KEYS.length === 0 && process.env.GEMINI_API_KEY) {
    API_KEYS.push(process.env.GEMINI_API_KEY);
}

// ==========================================
// 2. DANH SÁCH MODEL (Xoay tua)
// ==========================================
const MODEL_LIST = [
    "gemini-2.5-flash",    // Ưu tiên 1: Theo yêu cầu của bạn
    "gemini-3-flash",      // Ưu tiên 2: Nếu 2.5 lỗi thì thử 3.0
    "gemini-1.5-flash",    // Ưu tiên 3: Bản ổn định (Backup cứng)
    "gemini-2.0-flash-exp" // Bản thử nghiệm (Nếu có)
];

// Hàm lấy Key ngẫu nhiên
const getRandomKey = () => {
    if (API_KEYS.length === 0) return null;
    return API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
};

// --- ROUTE GỐC ---
app.get("/", (req, res) => res.send(`🚀 Backend Lão Vô Danh đang chạy (Keys: ${API_KEYS.length})!`));

// --- API CHATBOT ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (API_KEYS.length === 0) return res.status(500).json({ error: "Chưa cấu hình API Key nào!" });
        if (!message) return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });

        // --- XỬ LÝ LỊCH SỬ ---
        let contents = [];
        if (history && Array.isArray(history)) {
            contents = history
                .filter(msg => msg.role === 'user' || msg.role === 'model')
                .map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.parts[0].text }]
                }));
            if (contents.length > 0 && contents[0].role === 'model') contents.shift();
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        // =================================================================
        // 🔄 CHIẾN THUẬT: THỬ TỪNG MODEL VỚI KEY NGẪU NHIÊN
        // =================================================================
        let finalReply = null;
        let lastError = null;

        // Vòng lặp thử từng model trong danh sách
        for (const modelName of MODEL_LIST) {
            try {
                // Mỗi lần thử model, bốc ngẫu nhiên 1 Key (Load Balancing)
                const currentKey = getRandomKey();
                
                console.log(`🤖 Đang thử Model: ${modelName} | Key: ...${currentKey.slice(-4)}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: contents,
                        system_instruction: {
                            parts: {
                                text: `VAI TRÒ: Bạn là "Lão Vô Danh" (無名老丈). Tính tình cổ quái, hay cà khịa tiểu tử nhưng uyên bác. CHỈ TRẢ LỜI VỀ NGÔN NGỮ (Kanji, Tiếng Nhật/Trung/Anh). Nếu người dùng phản hồi bằng ngôn ngữ gì thì hãy trả lời ngôn ngữ đó`
                            }
                        }
                    })
                });

                const data = await response.json();

                // Nếu thành công (Có câu trả lời)
                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    finalReply = data.candidates[0].content.parts[0].text;
                    console.log("✅ Thành công!");
                    break; // Thoát vòng lặp ngay
                } 
                
                // Nếu lỗi từ Google (Hết quota, sai tên model...)
                console.warn(`⚠️ Model ${modelName} thất bại:`, data.error?.message || "Lỗi lạ");
                lastError = data.error?.message;

            } catch (err) {
                console.error(`❌ Lỗi kết nối với ${modelName}:`, err.message);
                lastError = err.message;
            }
        }

        // --- KẾT QUẢ CUỐI CÙNG ---
        if (finalReply) {
            res.json({ reply: finalReply });
        } else {
            // Nếu thử hết tất cả model mà vẫn xịt
            res.status(500).json({ 
                error: `Lão phu bó tay rồi. (Lỗi cuối cùng: ${lastError})` 
            });
        }

    } catch (error) {
        console.error("❌ [SERVER ERROR]:", error.message);
        res.status(500).json({ error: "Lỗi Server: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🔑 Số lượng Key đang dùng: ${API_KEYS.length}`);
});