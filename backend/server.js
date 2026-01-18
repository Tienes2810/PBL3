const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

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
app.get("/", (req, res) => res.send("🚀 Backend Lão Vô Danh đang chạy (Gemini Pro)!"));

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
            if (contents.length > 0 && contents[0].role === 'model') contents.shift();
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        // 🔥 QUAN TRỌNG: DÙNG MODEL "gemini-pro" (Bản ổn định nhất)
        // Nếu bản này chạy được, sau này ta sẽ tính chuyện lên 1.5 sau.
        const MODEL_NAME = "gemini-pro"; 
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: contents,
                // gemini-pro đôi khi kén chọn format system_instruction, 
                // nên ta tạm bỏ qua hoặc đưa vào prompt nếu cần thiết.
                // Ở đây ta chèn thẳng vào tin nhắn đầu tiên cho chắc ăn.
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `VAI TRÒ: Bạn là "Lão Vô Danh"... (giữ vai trò này nhé) \n\n Câu hỏi: ${message}` }]
                    },
                    ...contents.slice(1) // Ghép phần còn lại nếu có
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google API Error:", data);
            // In ra danh sách model hợp lệ để debug
            if (data.error?.code === 404) {
                 throw new Error(`Key của bạn không dùng được model ${MODEL_NAME}. Hãy thử tạo Key mới.`);
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