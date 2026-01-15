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

// --- 1. ENDPOINT ĐĂNG NHẬP (GIẢ LẬP CHO PBL3) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    console.log("Yêu cầu đăng nhập từ:", email);
    
    // Bạn có thể kết nối Database ở đây, hiện tại trả về thành công để bạn vào được Home
    if (email && password) {
        res.json({ 
            user: { email: email },
            token: "fake-jwt-token-for-pbl3" 
        });
    } else {
        res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });
    }
});

// --- 2. ENDPOINT NHẬN DIỆN KANJI (6 GỢI Ý) ---
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

        const finalCandidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "Mới", mean: "Tra cứu thêm" };
        });

        res.json({ candidates: finalCandidates });
    } catch (error) {
        console.error("Lỗi AI:", error.message);
        res.status(500).json({ error: "Lỗi xử lý AI" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`--- SERVER ĐÃ SẴN SÀNG TẠI CỔNG ${PORT} ---`);
});