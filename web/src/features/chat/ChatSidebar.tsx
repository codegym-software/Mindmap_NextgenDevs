import React, { useEffect, useRef, useState } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { useChatStore } from '../../app/store/useChatStore';
import { useAuth } from '../../hooks/useAuth';
import { chatApi } from '../../services/chatApi';
import { useRealtime } from '../../hooks/useRealtime'; // Để lấy hàm sendPatch

type Props = {
  mindmapId: string;
  sendPatch: (type: string, payload: any) => void; // Truyền hàm gửi từ cha xuống
};

export default function ChatSidebar({ mindmapId, sendPatch }: Props) {
  const { user } = useAuth();
  const { messages, isLoading, setLoading, setMessages, addMessage, isOpen, setIsOpen } = useChatStore();
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load lịch sử khi mount
  useEffect(() => {
    if (mindmapId && isOpen) {
      setLoading(true);
      chatApi.getHistory(mindmapId)
        .then(msgs => setMessages(msgs))
        .catch(err => console.error("Load chat failed", err))
        .finally(() => setLoading(false));
    }
  }, [mindmapId, isOpen]);

  // Auto scroll xuống cuối
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const content = inputText.trim();
    const tempId = Date.now().toString(); // ID tạm
    const myId = user?.sub || user?.id || 'guest';
    let myName = 'Khách'; // Mặc định

    if (user?.email) {
        // Nếu có email (vd: huan123@gmail.com) -> lấy huan123
        myName = user.email.split('@')[0];
    } else if (user?.displayName) {
        // Fallback nếu không có email thì lấy displayName
        myName = user.displayName;
    }
    // 1. Gửi qua WebSocket
    sendPatch('CHAT_MESSAGE', {
      id: tempId,
      content: content,
      senderName: myName,
      createdAt: new Date().toISOString()
    });

    // 2. Add ngay vào store để hiện lên UI của mình (Optimistic UI)
    addMessage({
      id: tempId,
      userId: myId,
      senderName: myName,
      content: content,
      createdAt: new Date().toISOString()
    });

    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 left-0 bottom-0 w-80 bg-white border-r border-gray-200 shadow-xl z-30 flex flex-col">
      
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <MessageSquare size={18} /> Thảo luận
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:bg-gray-200 p-1 rounded">
          <X size={18} />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {isLoading && <div className="text-center text-sm text-gray-400">Đang tải tin nhắn...</div>}
        
        {messages.map((msg) => {
          const isMe = msg.userId === (user?.sub || user?.id);
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-gray-500 mb-1 px-1">
                {isMe ? 'Bạn' : msg.senderName}
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm break-words ${
                isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.content}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;

                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                }
                }}
            placeholder="Nhập tin nhắn..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleSend}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}