// src/store/authStore.ts
import { create } from 'zustand';
import { signOut } from '@/auth/cognitoDirect';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut();
    } catch {
      // signOut đã xử lý fallback
    } finally {
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },
}));