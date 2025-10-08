// src/auth/cognito.ts
// Hosted UI + PKCE (giữ tinh thần code cũ của bạn, thêm scope đúng từ họ)

const domain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined;
export const logoutRedirect = import.meta.env.VITE_LOGOUT_REDIRECT_URI as string | undefined;

const SCOPE = "openid profile email";  // Thêm từ họ

function required(name: string, val: string | undefined): string {
  if (!val) throw new Error(`Missing env ${name}`);
  return val;
}

// ===== PKCE helpers ===== (giữ của bạn, thêm b64url từ họ)
function b64Url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function randomString(len = 64) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => ("0" + b.toString(16)).slice(-2)).join("");
}
export async function generateCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64Url(digest);
}

// ===== Hosted UI URLs ===== (merge, giữ tên hàm của bạn)
export function getLoginUrl(provider?: "Google" | "Cognito") {
  const d = required("VITE_COGNITO_DOMAIN", domain);
  const id = required("VITE_COGNITO_CLIENT_ID", clientId);
  const ru = required("VITE_COGNITO_REDIRECT_URI", redirectUri);
  const url = new URL(`https://${d}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", ru);
  url.searchParams.set("scope", SCOPE);  // Đúng encoding từ họ
  if (provider) url.searchParams.set("identity_provider", provider);
  return url.toString();
}

export async function loginRedirect(provider?: "Google" | "Cognito") {
  const state = randomString(24);
  const verifier = randomString(64);
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem("pkce_state", state);
  sessionStorage.setItem("pkce_verifier", verifier);

  const d = required("VITE_COGNITO_DOMAIN", domain);
  const id = required("VITE_COGNITO_CLIENT_ID", clientId);
  const ru = required("VITE_COGNITO_REDIRECT_URI", redirectUri);

  const authorize = new URL(`https://${d}/oauth2/authorize`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", id);
  authorize.searchParams.set("redirect_uri", ru);
  authorize.searchParams.set("scope", SCOPE);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  if (provider) authorize.searchParams.set("identity_provider", provider);

  window.location.href = authorize.toString();
}

export function getLogoutUrl(): string {
  const d = required("VITE_COGNITO_DOMAIN", domain);
  const id = required("VITE_COGNITO_CLIENT_ID", clientId);
  const lu = required("VITE_LOGOUT_REDIRECT_URI", logoutRedirect);
  const url = new URL(`https://${d}/logout`);
  url.searchParams.set("client_id", id);
  url.searchParams.set("logout_uri", lu);
  return url.toString();
}

// ===== Token Exchange / Refresh ===== (merge, giữ tên hàm của bạn)
export async function exchangeCodeForTokensPKCE(code: string, verifier: string) {
  const d = required("VITE_COGNITO_DOMAIN", domain);
  const id = required("VITE_COGNITO_CLIENT_ID", clientId);
  const ru = required("VITE_COGNITO_REDIRECT_URI", redirectUri);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: id,
    code_verifier: verifier,
    code,
    redirect_uri: ru,
  });
  const r = await fetch(`https://${d}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Token exchange failed: ${r.status}`);
  return r.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>;
}

export async function refreshWithCognito(refreshToken: string) {
  const d = required("VITE_COGNITO_DOMAIN", domain);
  const id = required("VITE_COGNITO_CLIENT_ID", clientId);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: id,
    refresh_token: refreshToken,
  });
  const r = await fetch(`https://${d}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`refresh_failed: ${r.status}`);
  return r.json() as Promise<{ access_token: string; id_token?: string; expires_in?: number }>;
}