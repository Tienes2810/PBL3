const express = require('express');
const cors = require('cors'); 
const supabase = require('./supabaseClient'); 
require('dotenv').config();

const app = express();

// Middleware - Phải đặt TRƯỚC các route app.post
app.use(cors()); 
app.use(express.json()); 

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

// Route kiểm tra trạng thái
app.get('/', (req, res) => {
    res.send('✅ Server Node.js đang hoạt động và sẵn sàng kết nối Supabase!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend chạy tại http://localhost:${PORT}`));