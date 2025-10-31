// src/features/auth/services/authStorage.ts
/**
 * Quản lý việc lưu trữ và truy xuất tokens từ localStorage.
 * Tái cấu trúc từ `services/authStorage.ts` cũ.
 */
import { Tokens } from '../../../core/types'; // Import kiểu Tokens chung

const KEY = "mindmap_tokens_v1"; // Đổi key để tránh xung đột

export function loadTokens(): Tokens | null {
    try {
        const stored = localStorage.getItem(KEY);
        if (!stored) return null;
        const tokens: Tokens = JSON.parse(stored);
        
        // Kiểm tra xem token còn hạn không
        if (tokens.expires_at && tokens.expires_at <= Math.floor(Date.now() / 1000)) {
            // Token đã hết hạn, kiểm tra refresh token
            if (!tokens.refresh_token) {
                 clearTokens(); // Không thể refresh, xóa luôn
                 return null;
            }
            // Nếu còn refresh token, vẫn trả về để interceptor xử lý
        }
        return tokens;
    } catch {
        return null;
    }
}

export function saveTokens(t: Tokens) {
    try {
        localStorage.setItem(KEY, JSON.stringify(t));
    } catch (e) {
        console.error("Failed to save tokens to localStorage:", e);
    }
}

export function clearTokens() {
    try {
        localStorage.removeItem(KEY);
    } catch (e) {
         console.error("Failed to clear tokens from localStorage:", e);
    }
}
