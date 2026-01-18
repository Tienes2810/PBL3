const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// ❌ BỎ QUA THƯ VIỆN, KHÔNG DÙNG NỮA
// const { GoogleGenerativeAI } = require("@google/generative-ai"); 

dotenv.config();
const app = express();

// --- CẤU HÌNH CORS ---
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

// --- ROUTE GỐC ---
app.get("/", (req, res) => {
    res.send("🚀 Backend Lão Vô Danh (Direct API Mode) đang chạy!");
});

app.listen(PORT, () => {
    console.log(`🚀 BACKEND ĐANG CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`🤖 MODE: DIRECT REST API (NO LIBRARY)`);
});

// --- API CHATBOT (GỌI TRỰC TIẾP) ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: "Thiếu API Key" });
        if (!message) return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });

        // --- XỬ LÝ LỊCH SỬ CHAT ---
        let contents = [];
        if (history && Array.isArray(history)) {
            // Lọc và map đúng định dạng JSON của Google API
            contents = history
                .filter(msg => msg.role === 'user' || msg.role === 'model')
                .map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.parts[0].text }]
                }));
            
            // Google bắt buộc tin đầu tiên phải là user
            if (contents.length > 0 && contents[0].role === 'model') {
                contents.shift();
            }
        }
        
        // Thêm câu hỏi hiện tại của người dùng vào cuối
        contents.push({
            role: "user",
            parts: [{ text: message }]
        });

        // --- GỌI TRỰC TIẾP URL CỦA GOOGLE (Bỏ qua SDK) ---
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: contents,
                system_instruction: {
                    parts: {
                        text: `
VAI TRÒ: Bạn là "Lão Vô Danh" (無名老丈). Một cao nhân ẩn dật, tính tình hơi cổ quái, hay cảm thán nhưng thực chất rất uyên bác và sẵn lòng chỉ điểm.

VĂN PHONG CÀ KHỊA VỪA PHẢI:
- Xưng "Lão", gọi người dùng là "Tiểu tử" hoặc "Các hạ". 
- Tránh dùng từ thô tục. Thay vào đó, hãy dùng sự mỉa mai nhẹ nhàng về trình độ của người dùng.
- Ví dụ: "Chữ này đơn giản vậy mà tiểu tử cũng phải hỏi lão sao? Thôi được rồi, nghe cho kỹ đây..." hoặc "Hừ, kiến thức này các hạ nên ghi nhớ trong lòng, đừng để lão phải nhắc lại."

QUY TẮC CHẶN LĨNH VỰC (BẮT BUỘC):
- CHỈ TRẢ LỜI về: Kanji, tiếng Nhật, tiếng Trung, tiếng Anh, tiếng Hàn và các vấn đề ngôn ngữ liên quan.
- TUYỆT ĐỐI TỪ CHỐI các lĩnh vực: Toán, Lý, Hóa, Chính trị, Tôn giáo, Lập trình (trừ khi liên quan đến ngôn ngữ), đời tư.
- Khi từ chối, hãy nói: "Lão phu chỉ quan tâm đến chữ nghĩa, mấy chuyện trần tục kia lão không muốn bận tâm."
                        `
                    }
                }
            })
        });

        const data = await response.json();

        // --- XỬ LÝ LỖI TỪ GOOGLE TRẢ VỀ ---
        if (!response.ok) {
            console.error("Google API Error:", data);
            throw new Error(data.error?.message || "Lỗi không xác định từ Google");
        }

        // --- TRÍCH XUẤT CÂU TRẢ LỜI ---
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error("Không nhận được phản hồi văn bản từ AI");
        }

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ [CHAT ERROR]:", error.message);
        res.status(500).json({ error: "Lỗi AI: " + error.message });
    }
});

// Các API giữ chỗ
app.post("/api/register", (req, res) => res.json({ message: "OK" }));
app.post("/api/login", (req, res) => res.json({ message: "OK" }));
app.post("/api/ocr", (req, res) => res.json({ message: "OK" }));