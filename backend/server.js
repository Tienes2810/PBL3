const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();

// --- 1. CẤU HÌNH CORS (QUAN TRỌNG) ---
// Cho phép cả Localhost (để bạn test) và Vercel (để chạy thật)
const corsOptions = {
    origin: [
        "http://localhost:2103",             // Frontend chạy ở máy bạn
        "https://kanjilearning.vercel.app"   // Frontend chạy trên Vercel
    ],
    credentials: true, // Cho phép gửi cookie/header xác thực nếu cần
    methods: ["GET", "POST", "OPTIONS"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// --- KIỂM TRA KEY ---
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ LỖI: Chưa có GEMINI_API_KEY trong file .env hoặc trên Render Environment");
}

// Khởi tạo Gemini (Lưu ý: Phải dùng thư viện mới nhất)
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

// --- THÊM ROUTE GỐC (Để Render biết server đang sống) ---
app.get("/", (req, res) => {
    res.send("🚀 Backend Lão Vô Danh đang chạy ổn định!");
});

app.listen(PORT, () => {
    console.log("\n========================================");
    console.log(`🚀 BACKEND ĐANG CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`🤖 MODEL: gemini-1.5-flash       SẴN SÀNG`);
    console.log("========================================\n");
});

// --- API CHATBOT ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });

        // --- 2. CẤU HÌNH MODEL: QUAY VỀ 1.5 FLASH ---
        // Lý do: Bản 2.5 Flash giới hạn 20 req/ngày (quá ít). 
        // Bản 1.5 Flash giới hạn 1500 req/ngày (thoải mái dev).
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION 
        });

        // --- LỌC LỊCH SỬ CHAT ---
        let cleanHistory = [];
        if (history && Array.isArray(history)) {
            // Lọc chỉ lấy tin nhắn user và model hợp lệ
            cleanHistory = history.filter(msg => msg.role === 'user' || msg.role === 'model');
            
            // Xóa tin nhắn đầu tiên nếu nó là của model (Google bắt buộc tin đầu phải là User)
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
        // Trả về lỗi chi tiết để dễ debug trên Frontend
        res.status(500).json({ error: "Lỗi AI: " + error.message });
    }
});

// Các API giữ chỗ
app.post("/api/register", (req, res) => res.json({ message: "OK" }));
app.post("/api/login", (req, res) => res.json({ message: "OK" }));
app.post("/api/ocr", (req, res) => res.json({ message: "OK" }));