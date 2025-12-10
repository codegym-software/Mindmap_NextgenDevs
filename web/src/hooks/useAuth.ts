// src/hooks/useAuth.ts
import { useContext } from "react";
import { AuthContext } from "../app/providers/AuthProvider";

/**
 * Custom hook to access authentication context.
 * Provides a consistent way to get auth state and functions throughout the app.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  // FIX: Directly expose the isAuthed boolean and other context values.
  // This aligns with the AuthCtx type and simplifies usage in components.
  return {
    isAuthed: ctx.isAuthed,
    user: ctx.user,
    login: ctx.login,
    logout: ctx.logout,
    openChangePassword: ctx.openChangePassword,
    closeChangePassword: ctx.closeChangePassword,
    getAccessToken: ctx.ensureFreshAccessToken,
    setAuthTokens: ctx.setAuthTokens, // Expose this for callbacks/modals
  };
}
