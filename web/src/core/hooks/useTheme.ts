/**
 * Hook tùy chỉnh để sử dụng ThemeContext.
 * Tái cấu trúc từ `hooks/useTheme.ts` cũ.
 */
import { useContext } from "react";
import { ThemeContext } from "../providers/ThemeProvider"; // Cập nhật đường dẫn

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    // Trả về tên đã đổi 'toggleTheme'
    return context;
};
