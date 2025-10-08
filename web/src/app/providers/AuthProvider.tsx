// src/app/providers/AuthProvider.tsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { loadTokens, saveTokens, clearTokens, type Tokens } from "../../services/authStorage";
import { loginRedirect, getLogoutUrl, exchangeCodeForTokensPKCE, refreshWithCognito } from "../../auth/cognito";

type AuthCtx = {
  tokens: Tokens | null;
  isAuthed: boolean;
  login: () => void;
  logout: () => void;
  setAuthTokens: (t: Tokens | null) => void;
  ensureFreshAccessToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthCtx>({
  tokens: null, isAuthed: false,
  login: () => {}, logout: () => {},
  setAuthTokens: () => {},
  ensureFreshAccessToken: async () => null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokensState] = useState<Tokens | null>(() => loadTokens());

  const setAuthTokens = useCallback((t: Tokens | null) => {
    setTokensState(t);
    if (t) saveTokens(t); else clearTokens();
  }, []);

  const isAuthed = !!tokens?.access_token;

  const login = useCallback(() => {
    loginRedirect(); // Hosted UI + PKCE
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setTokensState(null);
    window.location.href = getLogoutUrl();
  }, []);

  const ensureFreshAccessToken = useCallback(async () => {
    if (!tokens) return null;
    const now = Math.floor(Date.now() / 1000);
    const soon = now + 60;
    if ((tokens.expires_at ?? 0) > soon) return tokens.access_token;

    if (!tokens.refresh_token) return tokens.access_token;
    const next = await refreshWithCognito(tokens.refresh_token).catch(() => null);
    if (next) {
      const merged: Tokens = {
        access_token: next.access_token,
        id_token: next.id_token ?? tokens.id_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now()/1000) + (next.expires_in ?? 3600),
      };
      setAuthTokens(merged);
      return merged.access_token;
    }
    return tokens.access_token;
  }, [tokens, setAuthTokens]);

  // Handle /callback (optional)
  useEffect(() => {
    if (window.location.pathname !== "/callback") return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expected = sessionStorage.getItem("pkce_state");
    if (!code || !state || state !== expected) return;
    (async () => {
      const res = await exchangeCodeForTokensPKCE(code, sessionStorage.getItem("pkce_verifier") ?? "").catch(() => null);
      if (res) {
        setAuthTokens({
          access_token: res.access_token,
          id_token: res.id_token,
          refresh_token: res.refresh_token,
          expires_at: Math.floor(Date.now()/1000) + (res.expires_in ?? 3600),
        });
      }
      sessionStorage.removeItem("pkce_state");
      sessionStorage.removeItem("pkce_verifier");
      window.location.replace("/dashboard");
    })();
  }, [setAuthTokens]);

  const value = useMemo(() => ({ tokens, isAuthed, login, logout, setAuthTokens, ensureFreshAccessToken }), [tokens, isAuthed, login, logout, setAuthTokens, ensureFreshAccessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};