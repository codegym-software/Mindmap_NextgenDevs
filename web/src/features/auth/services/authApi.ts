// src/features/auth/services/authApi.ts
/**
 * Tương tác với các API Auth *custom* trên Backend (Spring Boot).
 * Tái cấu trúc từ `services/AuthApi.ts` cũ.
 * (Giả sử BE có /api/auth/...)
 */
import api from '../../../lib/axios'; // Dùng axios client
import { Tokens, UserProfile } from '../../../core/types';

// --- Types cho API Response (Giả sử) ---
// (Các type này nên được định nghĩa trong `core/types/api.ts` nếu lớn)
type LoginResponse = {
    // BE có thể trả về tokens trực tiếp
    tokens: Tokens;
    user: UserProfile; // Hoặc thông tin user
};

type RegisterResponse = {
    userSub: string;
    message: string;
};

type GenericAuthResponse = {
    message: string;
};


// Helper (tạm thời, vì axios đã xử lý việc này)
// export const parseResponse = async (response: Response) => { ... }
// Với axios, chúng ta chỉ cần response.data

/**
 * Đăng nhập bằng Email/Password (User Story #24)
 * (Endpoint này có thể không cần nếu dùng Cognito Hosted UI, nhưng code cũ có)
 * Giả sử BE có endpoint /api/auth/login
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
    // Endpoint này không có trong danh sách 25 endpoints (chỉ có /auth/callback)
    // Giả sử chúng ta dùng /api/auth/login (custom)
    console.warn("loginUser: Đang sử dụng endpoint giả định /api/auth/login. Cần xác nhận BE.");
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data; 
};

/**
 * Đăng ký bằng Email/Password (User Story #24)
 * Giả sử BE có endpoint /api/auth/register
 */
export const registerUser = async (email: string, password: string): Promise<RegisterResponse> => {
     console.warn("registerUser: Đang sử dụng endpoint giả định /api/auth/register. Cần xác nhận BE.");
    const response = await api.post<RegisterResponse>('/auth/register', { email, password });
    return response.data;
};

/**
 * Xác nhận đăng ký
 * Giả sử BE có /api/auth/confirm
 */
export const confirmSignup = async (username: string, code: string): Promise<GenericAuthResponse> => {
     console.warn("confirmSignup: Đang sử dụng endpoint giả định /api/auth/confirm. Cần xác nhận BE.");
    const response = await api.post<GenericAuthResponse>('/auth/confirm', { username, code });
    return response.data;
};

/**
 * Gửi lại mã xác nhận
 * Giả sử BE có /api/auth/resend-code
 */
export const resendConfirmationCode = async (username: string): Promise<GenericAuthResponse> => {
     console.warn("resendConfirmationCode: Đang sử dụng endpoint giả định /api/auth/resend-code. Cần xác nhận BE.");
    const response = await api.post<GenericAuthResponse>('/auth/resend-code', { username });
    return response.data;
};


/**
 * Quên mật khẩu (User Story #25)
 * Giả sử BE có /api/auth/forgot-password
 */
export const startForgotPassword = async (username: string): Promise<GenericAuthResponse> => {
    console.warn("startForgotPassword: Đang sử dụng endpoint giả định /api/auth/forgot-password. Cần xác nhận BE.");
    const response = await api.post<GenericAuthResponse>('/auth/forgot-password', { username });
    return response.data;
};

/**
 * Đặt lại mật khẩu
 * Giả sử BE có /api/auth/reset-password
 */
export const confirmResetPassword = async (username: string, code: string, newPassword: string): Promise<GenericAuthResponse> => {
    console.warn("confirmResetPassword: Đang sử dụng endpoint giả định /api/auth/reset-password. Cần xác nhận BE.");
    const response = await api.post<GenericAuthResponse>('/auth/reset-password', { username, code, newPassword });
    return response.data;
};

/**
 * Cập nhật mật khẩu (User Story #26)
 * PUT /api/users/me/password (Endpoint #15)
 */
export const changePassword = async (oldPassword: string, newPassword: string): Promise<GenericAuthResponse> => {
     const response = await api.put<GenericAuthResponse>('/users/me/password', { oldPassword, newPassword });
     return response.data;
};
