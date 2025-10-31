// src/core/hooks/useToast.ts
/**
 * Hook tùy chỉnh để sử dụng ToastContext.
 * Tái cấu trúc từ `hooks/useToast.ts` cũ.
 */
import { useContext } from "react";
import { ToastContext } from "../providers/NotificationProvider"; // Cập nhật đường dẫn

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a NotificationProvider");
    }
    return context;
};
