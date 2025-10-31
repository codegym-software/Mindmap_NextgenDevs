// src/features/auth/hooks/useAuth.ts
/**
 * Hook tùy chỉnh để truy cập AuthContext.
 * Tái cấu trúc từ `hooks/useAuth.ts` cũ.
 */
import { useContext } from "react";
import { AuthContext } from "../providers/AuthProvider"; // Cập nhật đường dẫn

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    
    // Trả về context đầy đủ
    return context;
};
