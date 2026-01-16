import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const KanjiCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  
  const traceRef = useRef([]); 
  const currentStrokeRef = useRef([]);
  const pointsRef = useRef([]); 

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set độ phân giải thật (để vẽ nét sắc nét)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr); // Scale để vẽ đúng vị trí
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black"; 
    ctx.shadowBlur = 1; // Giảm shadow xuống để dữ liệu sạch hơn
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    
    canvas.style.touchAction = "none";
  }, []);

  const getPos = (e) => {
    // Ưu tiên lấy tọa độ chính xác từ sự kiện
    if (e.nativeEvent && typeof e.nativeEvent.offsetX === 'number') {
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }
    // Fallback cho cảm ứng
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const drawCurve = (ctx, points) => {
    if (points.length < 3) return;
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const baseWidth = 10;
    // Tinh chỉnh độ đậm nhạt: Vẽ chậm -> nét to, Vẽ nhanh -> nét nhỏ
    let width = Math.max(4, baseWidth - (dist * 0.3)); 
    
    ctx.lineWidth = width;
    ctx.beginPath();
    const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const prevP = points[points.length - 3] || p1;
    const prevMid = { x: (prevP.x + p1.x) / 2, y: (prevP.y + p1.y) / 2 };
    ctx.moveTo(prevMid.x, prevMid.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    ctx.stroke();
  };

  const startDrawing = (e) => {
    if (e.buttons !== 1 && e.type === 'pointerdown') return;
    e.target.setPointerCapture(e.pointerId);

    const pos = getPos(e);
    isDrawing.current = true;
    
    pointsRef.current = [pos]; 
    currentStrokeRef.current = [[Math.round(pos.x), Math.round(pos.y)]]; 
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault(); 

    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    pointsRef.current.push(pos);
    drawCurve(ctx, pointsRef.current);

    // Lọc điểm: Giữ lại chi tiết để AI không bị "mù"
    // Giảm ngưỡng lọc xuống 4px để bắt được nét móc nhỏ
    const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    if (lastPoint) {
        const dist = Math.hypot(pos.x - lastPoint[0], pos.y - lastPoint[1]);
        if (dist > 4) { 
            currentStrokeRef.current.push([Math.round(pos.x), Math.round(pos.y)]);
        }
    }
  };

  const endDrawing = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (e.target && e.pointerId) e.target.releasePointerCapture(e.pointerId);

    if (currentStrokeRef.current.length > 1) {
        traceRef.current.push(currentStrokeRef.current);
        if (props.onStrokeEnd) props.onStrokeEnd();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    traceRef.current = [];
    currentStrokeRef.current = [];
    pointsRef.current = [];
  };

  const undo = () => {
    if (traceRef.current.length === 0) return;
    traceRef.current.pop();
    redraw();
    if (props.onStrokeEnd) props.onStrokeEnd();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 8;
    
    traceRef.current.forEach(stroke => {
      ctx.beginPath();
      if(stroke.length > 0) ctx.moveTo(stroke[0][0], stroke[0][1]);
      stroke.forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.stroke();
    });
  };

  // --- SỬA LỖI QUAN TRỌNG NHẤT Ở ĐÂY ---
  // Trả về kích thước hiển thị (CSS Pixels) thay vì kích thước vật lý (Physical Pixels)
  // Google cần cái này để khớp với tọa độ chuột
  const getDimensions = () => {
      if (!canvasRef.current) return { width: 500, height: 500 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
          width: rect.width, 
          height: rect.height
      };
  };

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    undo: undo,
    getTrace: () => traceRef.current,
    getDimensions: getDimensions 
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair touch-none"
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={endDrawing}
      onPointerLeave={endDrawing} 
      onPointerCancel={endDrawing}
    />
  );
});

export default KanjiCanvas;