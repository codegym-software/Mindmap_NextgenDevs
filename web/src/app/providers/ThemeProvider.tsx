import React, { createContext, useEffect, useState } from "react";

type ThemeCtx = { theme: "light" | "dark"; toggle: () => void; };
export const ThemeContext = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<"light"|"dark">(() => (localStorage.getItem("mm_theme") as any) || "light");

  useEffect(() => {
    localStorage.setItem("mm_theme", theme);
    document.documentElement.classList.remove("light", "dark");
    if (theme === 'dark') {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
};
