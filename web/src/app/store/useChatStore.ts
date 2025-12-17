import { create } from "zustand";

export type ChatMessage = {
  id: string;
  userId: string;
  senderName: string;
  content: string;
  createdAt: string; // ISO string
};

type ChatState = {
  isOpen: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  toggleChat: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  messages: [],
  unreadCount: 0,
  isLoading: false,

  toggleChat: () => set((state) => {
    const nextOpen = !state.isOpen;
    // Nếu mở chat thì reset unread
    return { isOpen: nextOpen, unreadCount: nextOpen ? 0 : state.unreadCount };
  }),

  setIsOpen: (isOpen) => set({ isOpen, unreadCount: isOpen ? 0 : 0 }),

  setMessages: (msgs) => set({ messages: msgs }),

  addMessage: (msg) => set((state) => {
    // Nếu chat đang đóng, tăng unread
    const newUnread = state.isOpen ? 0 : state.unreadCount + 1;
    return { 
      messages: [...state.messages, msg], 
      unreadCount: newUnread 
    };
  }),

  setLoading: (loading) => set({ isLoading: loading }),
}));