const express = require('express');
const cors = require('cors');
// Đảm bảo file supabaseClient.js của bạn đã đúng đường dẫn
const supabase = require('./supabaseClient'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CẤU HÌNH MIDDLEWARE (QUAN TRỌNG) ---
app.use(cors());

// 👇👇👇 SỬA Ở ĐÂY: Tăng giới hạn lên 50MB để nhận được ảnh lớn
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- KHỞI TẠO GOOGLE GEMINI ---
// Khởi tạo 1 lần ở ngoài để dùng chung
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// --- CÁC ROUTE API ---

// 1. Route Đăng ký
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Đăng ký thành công!", user: data.user });
});

// 2. Route Đăng nhập
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Đăng nhập thành công!", session: data.session });
});

// 3. API Nhận diện chữ viết tay (OCR)
app.post('/api/ocr', async (req, res) => {
  try {
    const { image } = req.body; // Nhận ảnh Base64 từ Frontend

    // Kiểm tra ảnh
    if (!image) {
      return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });
    }

    // Làm sạch chuỗi Base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Chọn model Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prompt chuẩn
    const prompt = "Đây là một chữ cái Kanji (tiếng Nhật) viết tay. Hãy nhận diện xem nó là chữ gì. Chỉ trả về duy nhất ký tự Kanji đó làm kết quả. Không thêm bất kỳ lời giải thích nào.";

    // Gửi lên Google
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      },
    ]);

    // Lấy kết quả
    const text = result.response.text().trim();
    console.log("Gemini nhận diện:", text);

    res.json({ result: text });

  } catch (error) {
    console.error("Lỗi Gemini:", error);
    // Trả về lỗi chi tiết hơn một chút để dễ debug
    res.status(500).json({ error: "Lỗi nhận diện", details: error.message });
  }
});

// Route kiểm tra sức khỏe server
app.get('/', (req, res) => {
    res.send('✅ Server Node.js + Gemini đang chạy ổn định!');
});

// Khởi động server
app.listen(PORT, () => console.log(`🚀 Backend chạy tại http://localhost:${PORT}`));