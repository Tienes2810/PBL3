const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// 1. Sử dụng thư viện mới nhất mà bạn vừa test thành công
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
app.use(cors());
// Tăng giới hạn dung lượng để nhận ảnh từ Canvas gửi lên
app.use(express.json({ limit: "10mb" }));

// 2. Khởi tạo Client bằng SDK mới
// Biến GEMINI_API_KEY sẽ được lấy từ file .env (ở máy) hoặc Environment (trên Render)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Endpoint xử lý nhận diện chữ Kanji
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Thiếu dữ liệu ảnh từ ứng dụng." });
        }

        // Loại bỏ phần header của chuỗi Base64 (data:image/png;base64,...)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // 4. Cú pháp gọi Gemini 2.5 Flash mới nhất
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Bạn là chuyên gia tiếng Nhật. Đây là chữ Kanji viết tay. Hãy nhận diện và trả về DUY NHẤT ký tự Kanji đó, không kèm giải thích." },
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

        // 5. Lấy kết quả văn bản từ AI
        const kanjiChar = response.text.trim();
        
        console.log("Dự án Kanji - AI nhận diện được:", kanjiChar);
        res.json({ kanji: kanjiChar });

    } catch (error) {
        console.error("Lỗi xử lý AI:", error.message);
        res.status(500).json({ 
            error: "Lỗi kết nối với trí tuệ nhân tạo", 
            details: error.message 
        });
    }
});

// Cấu hình cổng chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`--- SERVER ĐÃ SẴN SÀNG TẠI CỔNG ${PORT} ---`);
    console.log("Đang chạy SDK: @google/genai");
    console.log("Model mặc định: gemini-2.5-flash");
});