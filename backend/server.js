const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// KHÔNG DÙNG THƯ VIỆN (Để tránh lỗi version cũ trên Render)
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
const API_KEY = process.env.GEMINI_API_KEY;

// --- ROUTE GỐC ---
app.get("/", (req, res) => res.send("🚀 Backend Lão Vô Danh đang chạy (Mode: 2.5 Lite)!"));

// --- API CHATBOT ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!API_KEY) return res.status(500).json({ error: "Thiếu API Key" });
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
            // Google bắt buộc tin đầu phải là User
            if (contents.length > 0 && contents[0].role === 'model') contents.shift();
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        // =================================================================
        // 🛠️ KHU VỰC CHỈNH TÊN MODEL
        // Tiểu tử muốn dùng "2.5 Lite", ta đoán tên nó là một trong các cái dưới.
        // Nếu cái này lỗi, hãy thử bỏ chữ "-lite" đi: "gemini-2.5-flash"
        // =================================================================
        const MODEL_NAME = "gemini-2.5-flash"; 

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
        
        console.log(`🤖 Đang gọi model: ${MODEL_NAME}...`);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: contents,
                // System Instruction chèn thẳng vào đây cho Direct API
                system_instruction: {
                    parts: {
                        text: `VAI TRÒ: Bạn là "Lão Vô Danh" (無名老丈). Tính tình cổ quái, hay cà khịa tiểu tử nhưng uyên bác. CHỈ TRẢ LỜI VỀ NGÔN NGỮ (Kanji, Tiếng Nhật/Trung/Anh). Nếu người dùng phản hồi bằng ngôn ngữ gì thì hãy trả lời ngôn ngữ đó`
                    }
                }
            })
        });

        const data = await response.json();

        // --- XỬ LÝ LỖI ---
        if (!response.ok) {
            console.error("❌ Google API Error:", data);
            
            // Nếu lỗi 404 => Tên model sai
            if (data.error?.code === 404) {
                 throw new Error(`Tên model "${MODEL_NAME}" không đúng hoặc Key chưa được cấp quyền. Hãy thử đổi lại tên thành "gemini-1.5-flash" hoặc "gemini-pro" trong code.`);
            }
            // Nếu lỗi 429 => Hết tiền/Hết lượt
            if (data.error?.code === 429) {
                throw new Error("Lão phu mệt rồi (Hết lượt miễn phí hôm nay). Mai quay lại nhé!");
            }
            
            throw new Error(data.error?.message || "Lỗi Google API");
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("AI không trả lời.");

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ [CHAT ERROR]:", error.message);
        res.status(500).json({ error: "Lỗi: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});