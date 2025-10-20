import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { loadTokens, saveTokens, clearTokens, type Tokens } from "../../services/authStorage";
import { loginRedirect, getLogoutUrl, refreshWithCognito } from "../../auth/cognito";

// 🧩 Decode JWT (để lấy thông tin user từ id_token)
function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

type AuthCtx = {
  tokens: Tokens | null;
  user: Record<string, any> | null; // 👈 thêm user
  isAuthed: boolean;
  login: () => void;
  logout: () => void;
  setAuthTokens: (t: Tokens | null) => void;
  ensureFreshAccessToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthCtx>({
  tokens: null,
  user: null,
  isAuthed: false,
  login: () => {},
  logout: () => {},
  setAuthTokens: () => {},
  ensureFreshAccessToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokensState] = useState<Tokens | null>(() => loadTokens());
  const [user, setUser] = useState<Record<string, any> | null>(() => {
    const t = loadTokens();
    return t?.id_token ? decodeJwt(t.id_token) : null;
  });

  const setAuthTokens = useCallback((t: Tokens | null) => {
    setTokensState(t);
    if (t) {
      saveTokens(t);
      if (t.id_token) {
        const decoded = decodeJwt(t.id_token);
        setUser(decoded);
      }
    } else {
      clearTokens();
      setUser(null);
    }
  }, []);

  // Đồng bộ khi tab khác thay đổi localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "mm_tokens") {
        const latest = loadTokens();
        setTokensState(latest);
        setUser(latest?.id_token ? decodeJwt(latest.id_token) : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isAuthed = !!tokens?.access_token;

  const login = useCallback(() => {
    loginRedirect(); // Hosted UI + PKCE
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setTokensState(null);
    setUser(null);
    window.location.href = getLogoutUrl();
  }, []);

  const ensureFreshAccessToken = useCallback(async () => {
    if (!tokens) return null;

    const now = Math.floor(Date.now() / 1000);
    const soon = now + 60;

    if ((tokens.expires_at ?? 0) > soon) {
      return tokens.access_token;
    }

    if (!tokens.refresh_token) {
      return tokens.access_token;
    }

    try {
      const next = await refreshWithCognito(tokens.refresh_token);
      const merged: Tokens = {
        access_token: next.access_token,
        id_token: next.id_token ?? tokens.id_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (next.expires_in ?? 3600),
      };
      setAuthTokens(merged);
      return merged.access_token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return tokens.access_token;
    }
  }, [tokens, setAuthTokens]);

  const value = useMemo(
    () => ({
      tokens,
      user,
      isAuthed,
      login,
      logout,
      setAuthTokens,
      ensureFreshAccessToken,
    }),
    [tokens, user, isAuthed, login, logout, setAuthTokens, ensureFreshAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
