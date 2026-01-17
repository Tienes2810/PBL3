const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const supabase = require("../frontend/src/supabaseClient"); 
// ĐÃ XÓA: const kanjiDict = require("./kanji-dictionary.json"); -> Không cần nữa vì Frontend tự tra cứu rồi

dotenv.config();
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// --- LOG KHỞI ĐỘNG HỆ THỐNG ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("\n========================================");
    console.log(`🚀 BACKEND ĐANG CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`🗄️  DATABASE SUPABASE:          ĐÃ KẾT NỐI`);
    console.log("========================================\n");
});

// --- 1. ĐĂNG KÝ (Ghi vào Supabase) ---
app.post("/api/register", async (req, res) => {
    const { email, password } = req.body;
    console.log(`[REGISTER] Đang tạo tài khoản: ${email}`);
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error(`❌ [REGISTER ERROR] ${error.message}`);
            return res.status(400).json({ error: error.message });
        }

        console.log(`✅ [REGISTER SUCCESS] Đã tạo user: ${data.user?.id}`);
        res.json({ message: "Đăng ký thành công! Hãy đăng nhập ngay." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server khi đăng ký" });
    }
});

// --- 2. ĐĂNG NHẬP (KIỂM TRA THẬT SỰ) ---
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`[LOGIN] Đang kiểm tra: ${email}`);

    try {
        // HÀM QUAN TRỌNG: Kiểm tra pass với Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // NẾU SAI PASS -> CHẶN NGAY
        if (error) {
            console.log(`⛔ [LOGIN FAILED] Sai mật khẩu hoặc không tồn tại: ${email}`);
            return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác!" });
        }

        console.log(`✅ [LOGIN SUCCESS] User ${email} đã đăng nhập.`);
        res.json({ 
            message: "Đăng nhập thành công!",
            session: {
                user: data.user,
                token: data.session.access_token 
            }
        });

    } catch (err) {
        console.error("Lỗi Server:", err);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

// --- 3. API DỰ PHÒNG (Để không bị lỗi 404 nếu lỡ Frontend gọi nhầm) ---
app.post("/api/ocr", (req, res) => {
    res.json({ message: "Backend không còn xử lý OCR nữa. Frontend tự xử lý Offline rồi!" });
});