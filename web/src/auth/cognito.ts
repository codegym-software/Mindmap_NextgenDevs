// src/auth/cognito.ts
import { cognitoConfig } from './cognitoConfig';

/**
 * [ĐÃ CẬP NHẬT] Sửa lỗi Đăng xuất
 * Tệp này được dùng bởi trang /logout
 */
export function getLogoutUrl(): string {
 const u = new URL(`https://${cognitoConfig.Domain}/logout`);
 
 // [FIX] Thêm 'response_type' VÀ 'logout_uri'
 u.searchParams.set("response_type", "code");
 u.searchParams.set("client_id", cognitoConfig.ClientId);
 u.searchParams.set("logout_uri", cognitoConfig.RedirectUri.replace('/callback', '/dashboard'));
 
 return u.toString();
}

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cognitoConfig.ClientId,
    code,
    redirect_uri: cognitoConfig.RedirectUri,
  });

  const res = await fetch(`https://${cognitoConfig.Domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errorBody = await res.json();
    console.error("Token exchange failed:", errorBody);
    throw new Error(`token_exchange_failed: ${errorBody.error_description || res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>;
}