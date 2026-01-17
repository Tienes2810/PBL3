import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ICON ÔNG LÃO 2D (Giữ nguyên dung mạo các hạ đã ưng ý)
const OldMasterIcon = () => (
  <div className="w-12 h-12 shrink-0 bg-white border border-slate-200 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
    <svg viewBox="0 0 100 100" className="w-10 h-10 grayscale opacity-80" style={{ transform: 'translateY(4px)' }}>
      <path d="M10 40 L50 10 L90 40 Z" fill="white" stroke="black" strokeWidth="3" />
      <path d="M35 40 Q50 40 65 40 L65 55 Q50 65 35 55 Z" fill="white" stroke="black" strokeWidth="3"/>
      <path d="M40 50 L48 48" stroke="black" strokeWidth="2" />
      <path d="M52 48 L60 50" stroke="black" strokeWidth="2" />
      <path d="M35 55 Q50 100 65 55" fill="white" stroke="black" strokeWidth="3"/>
      <path d="M45 60 Q50 55 55 60" fill="none" stroke="black" strokeWidth="2"/>
    </svg>
  </div>
);

const AiChatPage = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([{ id: 1, role: 'model', text: 'Hừ, tiểu tử lại tìm đến lão có việc gì? Nói mau, lão đang bận thưởng trà.' }]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:10000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: messages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })) })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'model', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'model', text: 'Mạng mẽo không thông, lão phu không nghe rõ!' }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER BÌNH THƯỜNG */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-50 shadow-sm">
        <button onClick={() => navigate('/home')} className="p-2 hover:bg-slate-100 rounded-full mr-4 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">LÃO VÔ DANH</h1>
      </header>

      {/* CHAT AREA SẠCH SẼ */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                {!isUser ? <OldMasterIcon /> : <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">U</div>}
                <div className={`max-w-[85%] px-5 py-3 rounded-2xl shadow-sm border ${isUser ? 'bg-slate-900 text-white border-slate-800 rounded-br-none' : 'bg-slate-50 text-slate-800 border-slate-200 rounded-bl-none italic'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              </div>
            );
          })}
          {isTyping && <div className="text-slate-400 text-xs italic ml-16 animate-pulse font-bold tracking-widest">Đang mài mực...</div>}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* INPUT AREA */}
      <footer className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto flex gap-3 items-end bg-slate-100 p-2 rounded-2xl border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-200 transition-all">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Tiểu tử muốn thỉnh giáo điều gì? Nói mau..."
            className="flex-1 bg-transparent border-none outline-none p-3 text-slate-800 resize-none max-h-40 min-h-[48px]"
            rows={1}
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isTyping} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shrink-0 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AiChatPage;