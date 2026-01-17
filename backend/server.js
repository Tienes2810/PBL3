const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// --- KIỂM TRA KEY ---
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ LỖI: Chưa có GEMINI_API_KEY trong file .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
VAI TRÒ: Bạn là "Lão Vô Danh" (無名老丈). Một cao nhân ẩn dật, tính tình hơi cổ quái, hay cảm thán nhưng thực chất rất uyên bác và sẵn lòng chỉ điểm.

VĂN PHONG CÀ KHỊA VỪA PHẢI:
- Xưng "Lão", gọi người dùng là "Tiểu tử" hoặc "Các hạ". 
- Tránh dùng từ thô tục. Thay vào đó, hãy dùng sự mỉa mai nhẹ nhàng về trình độ của người dùng.
- Ví dụ: "Chữ này đơn giản vậy mà tiểu tử cũng phải hỏi lão sao? Thôi được rồi, nghe cho kỹ đây..." hoặc "Hừ, kiến thức này các hạ nên ghi nhớ trong lòng, đừng để lão phải nhắc lại."

QUY TẮC CHẶN LĨNH VỰC (BẮT BUỘC):
- CHỈ TRẢ LỜI về: Kanji, tiếng Nhật, tiếng Trung, tiếng Anh, tiếng Hàn và các vấn đề ngôn ngữ liên quan.
- TUYỆT ĐỐI TỪ CHỐI các lĩnh vực: Toán, Lý, Hóa, Chính trị, Tôn giáo, Lập trình (trừ khi liên quan đến ngôn ngữ), đời tư.
- Khi từ chối, hãy nói: "Lão phu chỉ quan tâm đến chữ nghĩa, mấy chuyện trần tục kia lão không muốn bận tâm."
`;

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log("\n========================================");
    console.log(`🚀 BACKEND ĐANG CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`🤖 MODEL: gemini-2.5-flash      SẴN SÀNG`);
    console.log("========================================\n");
});

// --- API CHATBOT ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });

        // --- CẤU HÌNH MODEL: DÙNG 'gemini-2.5-flash' ---
        // Đây là bản chuẩn hiện tại, thay thế cho 1.5 đã cũ.
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION 
        });

        // --- LỌC LỊCH SỬ CHAT ---
        let cleanHistory = [];
        if (history && Array.isArray(history)) {
            // Lọc chỉ lấy tin nhắn user và model hợp lệ
            cleanHistory = history.filter(msg => msg.role === 'user' || msg.role === 'model');
            
            // Xóa tin nhắn đầu tiên nếu nó là của model (do Google bắt buộc tin đầu phải là User)
            if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
                cleanHistory.shift();
            }
        }

        const chat = model.startChat({ 
            history: cleanHistory,
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ [CHAT ERROR]:", error);
        // Trả về lỗi chi tiết
        res.status(500).json({ error: "Lỗi AI: " + error.message });
    }
});

// Các API giữ chỗ
app.post("/api/register", (req, res) => res.json({ message: "OK" }));
app.post("/api/login", (req, res) => res.json({ message: "OK" }));
app.post("/api/ocr", (req, res) => res.json({ message: "OK" }));