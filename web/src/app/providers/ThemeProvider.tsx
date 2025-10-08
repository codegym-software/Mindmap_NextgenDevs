import React, { createContext, useEffect, useState } from "react";

type ThemeCtx = { theme: "light" | "dark"; toggle: () => void; };
export const ThemeContext = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<"light"|"dark">(() => (localStorage.getItem("mm_theme") as any) || "dark");

  useEffect(() => {
    localStorage.setItem("mm_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
};
