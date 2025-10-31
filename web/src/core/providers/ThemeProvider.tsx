/**
 * Provider cho Theme (Light/Dark mode).
 * Tái cấu trúc từ `app/providers/ThemeProvider.tsx` cũ.
 * Sử dụng Tailwind dark mode class.
 */
import React, { createContext, useEffect, useState, useMemo } from "react";

type Theme = "light" | "dark";
type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void; // Đổi tên 'toggle' thành 'toggleTheme' cho rõ ràng
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Key lưu theme trong localStorage
const THEME_STORAGE_KEY = "mindmap_theme_v1";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    
    // Lấy theme đã lưu, fallback về 'dark'
    const getInitialTheme = (): Theme => {
        try {
            const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
            // Kiểm tra xem có phải là 'light' hoặc 'dark' không
            if (storedTheme === 'light' || storedTheme === 'dark') {
                return storedTheme;
            }
            // Nếu không, kiểm tra theme hệ thống
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        } catch (error) {
            // Bỏ qua lỗi (e.g., localStorage bị block)
        }
        return 'dark'; // Mặc định là dark
    };

    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Effect để cập nhật <html> class và localStorage
    useEffect(() => {
        const root = window.document.documentElement;
        
        // Xóa class cũ
        root.classList.remove('light', 'dark');
        
        // Thêm class hiện tại
        root.classList.add(theme);

        // Lưu vào localStorage
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
            console.warn("Could not save theme to localStorage:", error);
        }
    }, [theme]); // Chạy mỗi khi theme thay đổi

    // Hàm toggle theme
    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Dùng useMemo để tránh re-render không cần thiết
    const contextValue = useMemo(() => ({
        theme,
        toggleTheme,
    }), [theme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};
