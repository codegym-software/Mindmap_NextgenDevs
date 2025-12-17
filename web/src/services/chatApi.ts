import api from './api';
import { ChatMessage } from '../app/store/useChatStore';

export const chatApi = {
  // Lấy lịch sử chat
  getHistory: async (mindmapId: string): Promise<ChatMessage[]> => {
    const res = await api.get<ChatMessage[]>(`/mindmaps/${mindmapId}/messages`);
    return res.data;
  },

  // (Optional) Gửi tin nhắn qua API (nếu không muốn gửi qua Socket)
  // Nhưng ở đây ta dùng Socket cho nhanh, API này dùng để backup
  sendMessage: async (mindmapId: string, content: string) => {
    return api.post(`/mindmaps/${mindmapId}/messages`, { content });
  }
};