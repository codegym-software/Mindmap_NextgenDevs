// src/services/authStorage.ts
export type Tokens = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_at?: number; // epoch seconds
};

const KEY = "mm_tokens";

export function loadTokens(): Tokens | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
  catch { return null; }
}

export function saveTokens(t: Tokens) {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function clearTokens() {
  localStorage.removeItem(KEY);
}

export function isExpired(t?: Tokens | null, skewSeconds = 30): boolean {
  if (!t?.expires_at) return true;
  return t.expires_at <= Math.floor(Date.now() / 1000) + skewSeconds;
}