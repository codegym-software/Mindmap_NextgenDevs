// src/features/auth/services/cognito.ts
/**
 * Các hàm tương tác trực tiếp với Cognito (không qua BE).
 * Tái cấu trúc từ `auth/cognito.ts` cũ.
 */
import { cognitoConfig } from '../../../config';
import { Tokens } from '../../../core/types';

/**
 * Xây dựng URL đăng xuất của Cognito (User Story #30)
 */
export function getLogoutUrl(): string {
    const u = new URL(`https://${cognitoConfig.Domain}/logout`);
    u.searchParams.set("client_id", cognitoConfig.ClientId);
    u.searchParams.set("logout_uri", cognitoConfig.LogoutRedirectUri); // Dùng config
    return u.toString();
}

/**
 * Xây dựng URL đăng nhập Google (User Story #27)
 */
export const getGoogleLoginUrl = () => {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: cognitoConfig.ClientId,
        redirect_uri: cognitoConfig.RedirectUri,
        scope: cognitoConfig.Scope,
        identity_provider: 'Google', // Chỉ định Google
    });
    return `https://${cognitoConfig.Domain}/oauth2/authorize?${params.toString()}`;
};

/**
 * Đổi authorization code (từ Google/Cognito) lấy tokens.
 * Dùng trong CallbackPage (Router #5).
 */
export async function exchangeCodeForTokens(code: string): Promise<Tokens> {
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

    const data: {
        access_token: string;
        id_token: string;
        refresh_token?: string;
        expires_in?: number;
    } = await res.json();
    
    return {
        access_token: data.access_token,
        id_token: data.id_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    };
}

/**
 * Dùng refresh token để lấy access token mới.
 * Dùng trong `lib/axios.ts` interceptor.
 */
export async function refreshWithCognito(refreshToken: string): Promise<{
    access_token: string;
    id_token?: string;
    expires_in?: number;
}> {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: cognitoConfig.ClientId,
        refresh_token: refreshToken,
    });

    const res = await fetch(`https://${cognitoConfig.Domain}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!res.ok) {
        console.error("Cognito refresh token failed:", await res.json());
        throw new Error("refresh_failed");
    }

    return res.json();
}
