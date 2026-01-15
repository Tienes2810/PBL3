const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// 1. Sử dụng thư viện mới @google/genai theo tài liệu cập nhật
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
app.use(cors());
// Tăng giới hạn dung lượng để nhận ảnh từ Canvas gửi lên
app.use(express.json({ limit: "10mb" }));

// 2. Khởi tạo Client (Sử dụng API Key mới, không bị leak)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. API nhận diện chữ Kanji
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Không tìm thấy dữ liệu ảnh." });
        }

        // Loại bỏ phần header của chuỗi Base64
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // 4. Gọi Model Gemini 2.5 Flash với cấu hình SDK mới
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Đây là một chữ Kanji viết tay trên nền trắng. Hãy nhận diện và trả về duy nhất ký tự Kanji đó." },
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: "image/png",
                            },
                        },
                    ],
                },
            ],
        });

        // 5. XỬ LÝ LỖI AN TOÀN: Kiểm tra sự tồn tại của dữ liệu trước khi dùng trim()
        // result.text có thể bị undefined nếu AI không thấy gì trong ảnh đen
        const rawText = result?.text || ""; 
        const kanjiChar = rawText ? rawText.trim() : "Không thể nhận diện";

        console.log("--- KẾT QUẢ TỪ AI ---");
        console.log("Nhận diện được:", kanjiChar);
        
        res.json({ kanji: kanjiChar });

    } catch (error) {
        // Log lỗi chi tiết để bạn theo dõi trên Dashboard Render
        console.error("Lỗi xử lý AI chi tiết:", error.message);
        
        // Trả về lỗi chuyên nghiệp để Frontend không bị hiện bảng đen đứng máy
        res.status(500).json({ 
            error: "Hệ thống AI đang bận hoặc gặp sự cố", 
            details: error.message 
        });
    }
});

// Cổng chạy server (Render thường dùng cổng 10000 hoặc tùy chỉnh qua env)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`--- SERVER ĐÃ SẴN SÀNG ---`);
    console.log(`Cổng: ${PORT}`);
    console.log(`SDK: @google/genai`);
    console.log(`Model: gemini-2.5-flash`);
});