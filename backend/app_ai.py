from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import numpy as np
import cv2
from manga_ocr import MangaOcr
from PIL import Image

app = Flask(__name__)
CORS(app)

print("⏳ Đang tải Model Manga-OCR...")
mocr = MangaOcr()
print("✅ Đã tải xong Model! Sẵn sàng chiến.")

def process_image_smart(nparr):
    # 1. Đọc ảnh
    img_rgba = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    
    # Tạo nền trắng
    white_bg = np.ones_like(img_rgba, dtype=np.uint8) * 255
    alpha_channel = img_rgba[:, :, 3]
    alpha_factor = alpha_channel[:, :, np.newaxis] / 255.0
    white_bg[:, :, :3] = (1.0 - alpha_factor) * 255 + alpha_factor * img_rgba[:, :, :3]
    gray = cv2.cvtColor(white_bg[:, :, :3], cv2.COLOR_BGR2GRAY)

    # 2. Threshold
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    # 3. Cắt vùng chứa chữ
    coords = cv2.findNonZero(thresh)
    if coords is None:
        return gray
    x, y, w, h = cv2.boundingRect(coords)
    cropped = thresh[y:y+h, x:x+w]

    # 4. TẠO KHUNG VUÔNG VÀ CĂN GIỮA (QUAN TRỌNG)
    # AI cần không gian thoáng để nhận diện đúng
    dim = max(w, h)
    
    # Tăng viền trắng lên (Padding) để chữ không bị sát lề
    padding = int(dim * 0.3) # Viền dày bằng 30% chữ
    square_size = dim + (padding * 2)
    
    square_img = np.zeros((square_size, square_size), dtype=np.uint8)

    center_x = (square_size - w) // 2
    center_y = (square_size - h) // 2
    square_img[center_y:center_y+h, center_x:center_x+w] = cropped

    # 5. XỬ LÝ NÉT (SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY)
    # Thay vì làm đậm (dilate) khiến nét dính vào nhau
    # Ta dùng GaussianBlur để làm mịn rìa răng cưa, giúp chữ trông tự nhiên hơn
    blurred = cv2.GaussianBlur(square_img, (5, 5), 0)

    # Đảo ngược lại thành Chữ Đen - Nền Trắng
    final_result = cv2.bitwise_not(blurred)

    return final_result

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        image_data = data['image'].split(',')[1]
        decoded_data = base64.b64decode(image_data)
        nparr = np.frombuffer(decoded_data, np.uint8)
        
        final_img_cv = process_image_smart(nparr)
        
        # Debug: Lưu ảnh để bạn kiểm tra xem nét có bị dính không
        cv2.imwrite("debug_smart_crop.jpg", final_img_cv) 

        pil_image = Image.fromarray(final_img_cv)
        text_result = mocr(pil_image)
        
        print(f"🔍 Manga-OCR đọc được: '{text_result}'")

        if not text_result:
             return jsonify({'status': 'success', 'character': '?', 'message': 'Không đọc được'})

        detected_char = text_result.strip()[0]

        return jsonify({
            'status': 'success',
            'character': detected_char,
            'confidence': 0.99
        })

    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("AI Server đang chạy tại http://127.0.0.1:5001")
    app.run(port=5001, debug=True)