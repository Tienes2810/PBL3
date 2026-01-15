const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); 

dotenv.config();
const app = express();

app.use(cors({ origin: "*" })); // Cho phép Vercel truy cập
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- 1. ROUTE ĐĂNG NHẬP (SỬA ĐỂ KHỚP VỚI FRONTEND) ---
// Dùng /api/login để phân biệt với các route khác
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ 
            message: "Thành công!",
            session: { user: { email }, token: "fixed-token-pbl3" } 
        });
    } else {
        res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
    }
});

// --- 2. ROUTE NHẬN DIỆN KANJI (6 GỢI Ý) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const chars = result.response.text().trim().split("").slice(0, 6);
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Dữ liệu AI" };
        });

        res.json({ candidates });
    } catch (error) {
        res.status(500).json({ error: "Lỗi AI" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE tại cổng ${PORT}`));