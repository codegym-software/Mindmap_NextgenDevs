// src/hooks/useAuth.ts
import { useContext } from "react";
import { AuthContext } from "../app/providers/AuthProvider";

export function useAuth() {
  const ctx = useContext(AuthContext);
  return {
    isAuthenticated: () => ctx.isAuthed,
    login: ctx.login,
    logout: ctx.logout,
    getAccessToken: ctx.ensureFreshAccessToken,  // Thêm từ họ (refresh auto)
  };
}