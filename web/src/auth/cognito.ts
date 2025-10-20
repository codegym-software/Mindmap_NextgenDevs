// src/auth/cognito.ts
// Cognito + PKCE (state + verifier) – chuẩn OAuth2 Code + S256

const DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN as string;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI as string;
const LOGOUT_REDIRECT_URI = import.meta.env.VITE_LOGOUT_REDIRECT_URI as string;

function required(name: string, val: string | undefined): string {
  if (!val) throw new Error(`Missing env ${name}`);
  return val;
}

function b64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomString(len = 64) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => ("0" + b.toString(16)).slice(-2)).join("");
}

export async function sha256(v: string) {
  const data = new TextEncoder().encode(v);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return b64url(digest);
}

// === LOGIN (Hosted UI + PKCE) ===
export async function loginRedirect(provider?: "Google" | "Cognito") {
  const state = randomString(24);
  const verifier = randomString(64);
  const challenge = await sha256(verifier);

  sessionStorage.setItem("pkce_state", state);
  sessionStorage.setItem("pkce_verifier", verifier);

  const d = required("VITE_COGNITO_DOMAIN", DOMAIN);
  const id = required("VITE_COGNITO_CLIENT_ID", CLIENT_ID);
  const ru = required("VITE_COGNITO_REDIRECT_URI", REDIRECT_URI);

  const url = new URL(`https://${d}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", ru);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  if (provider) url.searchParams.set("identity_provider", provider);

  window.location.href = url.toString();
}

export function getLogoutUrl(): string {
  const d = required("VITE_COGNITO_DOMAIN", DOMAIN);
  const id = required("VITE_COGNITO_CLIENT_ID", CLIENT_ID);
  const lu = required("VITE_LOGOUT_REDIRECT_URI", LOGOUT_REDIRECT_URI);
  const u = new URL(`https://${d}/logout`);
  u.searchParams.set("client_id", id);
  u.searchParams.set("logout_uri", lu);
  return u.toString();
}

// === EXCHANGE TOKEN ===
export async function exchangeCodeForTokensPKCE(code: string, verifier: string) {
  const d = required("VITE_COGNITO_DOMAIN", DOMAIN);
  const id = required("VITE_COGNITO_CLIENT_ID", CLIENT_ID);
  const ru = required("VITE_COGNITO_REDIRECT_URI", REDIRECT_URI);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: id,
    code,
    code_verifier: verifier,
    redirect_uri: ru,
  });

  const res = await fetch(`https://${d}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  
  if (!res.ok) {
    throw new Error(`token_exchange_failed:${res.status}`);
  }
  
  return res.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>;
}

export async function refreshWithCognito(refreshToken: string) {
  const d = required("VITE_COGNITO_DOMAIN", DOMAIN);
  const id = required("VITE_COGNITO_CLIENT_ID", CLIENT_ID);
  
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: id,
    refresh_token: refreshToken,
  });

  const res = await fetch(`https://${d}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  
  if (!res.ok) throw new Error("refresh_failed");
  
  return res.json() as Promise<{ 
    access_token: string; 
    id_token?: string; 
    expires_in?: number 
  }>;
}