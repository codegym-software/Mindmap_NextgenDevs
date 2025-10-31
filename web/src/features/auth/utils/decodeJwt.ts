/**
 * Hàm tiện ích để giải mã JWT (id_token) lấy thông tin user.
 * Tái cấu trúc từ file cũ.
 */
import { UserProfile } from '../../../core/types';

export function decodeJwt(token: string): UserProfile | null {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload) as UserProfile;
    } catch (e) {
        console.error("Failed to decode JWT:", e);
        return null;
    }
}
