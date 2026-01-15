const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); 

dotenv.config();
const app = express();

// Cấu hình CORS mở để Vercel truy cập
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- 1. ROUTE ĐĂNG NHẬP (Fix lỗi 404) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    console.log("Đăng nhập:", email);
    
    if (email && password) {
        res.json({ 
            message: "Đăng nhập thành công!",
            session: { user: { email: email }, token: "fixed-token-pbl3" } 
        });
    } else {
        res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }
});

// --- 2. ROUTE ĐĂNG KÝ ---
app.post("/api/register", (req, res) => {
    const { email } = req.body;
    res.json({ message: "Đăng ký thành công! Hãy đăng nhập." });
});

// --- 3. ROUTE NHẬN DIỆN KANJI (6 GỢI Ý) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const chars = result.response.text().trim().split("").slice(0, 6);

        // Khớp dữ liệu offline ngay tại server để tăng tốc độ
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Nhấn phân tích để xem chi tiết AI" };
        });

        res.json({ candidates });
    } catch (error) {
        console.error("Lỗi AI:", error.message);
        res.status(500).json({ error: "Lỗi kết nối AI" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE tại cổng ${PORT}`));