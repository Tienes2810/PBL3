const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// KHÔNG DÙNG THƯ VIỆN ĐỂ TRÁNH LỖI VERSION
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

// --- ROUTE KIỂM TRA MODEL (QUAN TRỌNG) ---
// Truy cập vào đây để xem Key của bạn dùng được model nào
app.get("/api/check-models", async (req, res) => {
    try {
        if (!API_KEY) return res.status(500).send("❌ Chưa có API Key!");
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            return res.status(400).json(data.error);
        }

        // Lọc ra các model Gemini
        const models = data.models
            ?.filter(m => m.name.includes("gemini"))
            ?.map(m => m.name.replace("models/", ""));

        res.json({ 
            message: "Danh sách Model Key này dùng được:",
            available_models: models 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/", (req, res) => res.send("🚀 Backend Lão Vô Danh đang chạy!"));

// --- API CHATBOT ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!API_KEY) return res.status(500).json({ error: "Thiếu API Key server" });
        if (!message) return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });

        // --- XỬ LÝ LỊCH SỬ CHAT ---
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

        // 🔥 THAY ĐỔI QUAN TRỌNG: DÙNG TÊN ĐẦY ĐỦ "gemini-1.5-flash-001"
        // Nếu vẫn lỗi, hãy thử đổi thành "gemini-pro" (bản 1.0 siêu ổn định)
        const MODEL_NAME = "gemini-1.5-flash-001"; 
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: contents,
                system_instruction: {
                    parts: {
                        text: `VAI TRÒ: Bạn là "Lão Vô Danh" (無名老丈)... (giữ nguyên prompt cũ)`
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google API Error:", data);
            // Nếu lỗi 404 ở đây, nghĩa là tên model vẫn sai với Key này
            throw new Error(data.error?.message || "Lỗi Google API");
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("AI không trả lời (Empty response)");

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ [CHAT ERROR]:", error.message);
        res.status(500).json({ error: "Lỗi: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});