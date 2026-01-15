const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// 1. Nhập SDK mới thay cho bản @google/generative-ai cũ
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
app.use(cors());
// Tăng giới hạn để nhận ảnh vẽ từ Canvas (Base64)
app.use(express.json({ limit: "10mb" }));

// 2. Khởi tạo Client theo cú pháp SDK mới
// Nó sẽ sử dụng GEMINI_API_KEY bạn đã cấu hình trong file .env hoặc Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. API xử lý nhận diện chữ Kanji
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: "Không tìm thấy dữ liệu ảnh từ Canvas" });
        }

        // Loại bỏ phần đầu của chuỗi Base64
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // 4. Gọi Model Gemini 2.5 Flash theo cú pháp mới đã test thành công
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Đây là một chữ Kanji viết tay. Hãy cho biết đó là chữ gì. Chỉ trả về duy nhất 1 ký tự Kanji đó." },
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

        // 5. Trích xuất văn bản trả về
        const detectedKanji = response.text.trim();
        
        console.log("AI nhận diện thành công:", detectedKanji);
        res.json({ kanji: detectedKanji });

    } catch (error) {
        console.error("Lỗi khi gọi Gemini 2.5 SDK:", error.message);
        res.status(500).json({ 
            error: "Lỗi kết nối AI", 
            details: error.message 
        });
    }
});

// Chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server PBL3 đang chạy tại cổng ${PORT}`);
    console.log("Sử dụng SDK: @google/genai");
    console.log("Model: gemini-2.5-flash");
});