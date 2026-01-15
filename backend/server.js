const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// SỬ DỤNG CHÍNH XÁC BỘ SDK MỚI
const { GoogleGenAI } = require("@google/genai"); 
const kanjiDict = require("./kanji-dictionary.json");

dotenv.config();
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// 1. KHỞI TẠO SDK @google/genai
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- ROUTE ĐĂNG NHẬP (Fix lỗi 404) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ 
            message: "Đăng nhập thành công!",
            session: { user: { email }, token: "pbl3-fixed-auth-2026" } 
        });
    } else {
        res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
    }
});

// --- ROUTE OCR KANJI (Sửa lỗi getGenerativeModel is not a function) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Không có ảnh" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // FIX LỖI: Truy cập qua .generativeAI để dùng được getGenerativeModel
        // Sử dụng model gemini-2.5-flash mới nhất
        const model = ai.generativeAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const text = result.response.text().trim();
        const chars = text.split("").slice(0, 6);

        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Dữ liệu AI" };
        });

        res.json({ candidates });
    } catch (error) {
        console.error("LỖI CHI TIẾT TỪ SDK:", error.message);
        res.status(500).json({ error: `Lỗi AI: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE với SDK @google/genai & Gemini 2.5 Flash`));