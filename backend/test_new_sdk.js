const { GoogleGenAI } = require("@google/genai"); // Cú pháp SDK mới

// 👇 DÁN CÁI KEY CỦA DỰ ÁN "KANJI" VÀO ĐÂY (Cái đuôi ...BnQA ấy)
const API_KEY = "AIzaSyCXQZOw4Qeu1pW89DiKd-jBpiucgCQqkkc"; 

const ai = new GoogleGenAI({ apiKey: API_KEY }); // Khởi tạo Client kiểu mới

async function testNewSDK() {
  console.log("--- ĐANG TEST API VỚI CÚ PHÁP SDK MỚI ---");
  try {
    // Gọi model theo cấu trúc mới: ai.models.generateContent
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Dùng model mới nhất
      contents: [
        {
          role: "user",
          parts: [{ text: "Trả lời 'OK' nếu bạn thấy tin nhắn này từ SDK mới." }]
        }
      ]
    });

    // Cách lấy text cũng ngắn gọn hơn
    console.log("\n✅ KẾT QUẢ:");
    console.log("AI trả lời:", response.text);
    console.log("\n=> KẾT LUẬN: SDK mới hoạt động hoàn hảo!");

  } catch (error) {
    console.log("\n❌ LỖI RỒI:");
    console.error(error.message);
    console.log("\nNếu lỗi 404, hãy kiểm tra lại xem đã chọn đúng model chưa.");
  }
}

testNewSDK();