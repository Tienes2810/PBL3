import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const currentLineWidth = useRef(15); // Độ dày mặc định ban đầu

  // --- CÁC HÀM CHO PHÉP FILE CHA (HOMEPAGE) GỌI ---
  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    getCanvasImage: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return null;
    }
  }));

  // --- KHỞI TẠO CANVAS (ĐỘ PHÂN GIẢI CAO) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    
    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      
      // Tăng độ phân giải lên gấp đôi (Retina scaling) để nét vẽ mịn, không vỡ hạt
      canvas.width = rect.width * 2; 
      canvas.height = rect.height * 2;
      
      const context = canvas.getContext("2d");
      context.scale(2, 2); 
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#000000"; // Mực đen tuyệt đối cho AI dễ đọc
      contextRef.current = context;
    };

    updateSize();
    // Cập nhật lại khi người dùng thay đổi kích thước cửa sổ
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // --- TÍNH TOÁN TỌA ĐỘ CHUẨN ---
  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    lastPos.current = getCoords(e);
    // Reset độ dày khi bắt đầu nét mới
    currentLineWidth.current = 15; 
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const coords = getCoords(e);
    const context = contextRef.current;
    
    // Tính tốc độ vẽ (khoảng cách di chuyển)
    const dist = Math.sqrt(
      Math.pow(coords.x - lastPos.current.x, 2) + 
      Math.pow(coords.y - lastPos.current.y, 2)
    );
    
    // --- CẤU HÌNH ĐỘ DÀY NÉT BÚT (QUAN TRỌNG) ---
    // Điều chỉnh để nét không bị dính cục (như số 2) mà vẫn đủ đậm
    // Vẽ càng nhanh -> Nét càng thanh
    let targetWidth = 22 - (dist / 10) * 8; 
    
    // Giới hạn độ to nhỏ (Min 8px - Max 22px)
    if (targetWidth < 8) targetWidth = 8;   // Đủ nhỏ để tách nét chi tiết
    if (targetWidth > 22) targetWidth = 22; // Đủ to để MangaOCR nhìn thấy

    // Làm mượt sự thay đổi độ dày (Smooth transition)
    currentLineWidth.current = currentLineWidth.current * 0.8 + targetWidth * 0.2;

    context.beginPath();
    context.lineWidth = currentLineWidth.current;
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(coords.x, coords.y);
    context.stroke();
    
    lastPos.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      className="w-full h-full cursor-crosshair bg-[#FCFAF7] block touch-none"
      style={{ touchAction: 'none' }} // Chặn cuộn trang khi vẽ trên màn cảm ứng
    />
  );
});

export default KanjiCanvas;