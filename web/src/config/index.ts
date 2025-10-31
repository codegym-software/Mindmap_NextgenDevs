/**
 * File cấu hình trung tâm cho các keys và endpoints.
 * Thay thế cho cognitoConfig.ts cũ.
 */

// Cấu hình Cognito, lấy từ biến môi trường
export const cognitoConfig = {
    Domain: import.meta.env.VITE_COGNITO_DOMAIN as string,
    ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
    RedirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI as string,
    LogoutRedirectUri: import.meta.env.VITE_LOGOUT_REDIRECT_URI as string,
    Scope: 'openid email profile', // Các scope cần thiết
};

// Cấu hình API Endpoint
export const apiConfig = {
    // Lấy URL API từ biến môi trường, fallback về /api cho proxy
    baseURL: import.meta.env.VITE_API_URL?.trim() || "/api",
    // Timeout (ví dụ: 10 giây)
    timeout: 10000,
};
