// src/hooks/useTheme.ts
import { useContext } from "react";
import { ThemeContext } from "../app/providers/ThemeProvider";

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  // Đổi tên 'toggle' thành 'toggleTheme' cho rõ ràng hơn khi sử dụng
  return { theme: context.theme, toggleTheme: context.toggle };
};