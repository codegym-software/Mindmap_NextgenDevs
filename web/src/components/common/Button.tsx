import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gradient" | "outline" | "ghost"; size?: "sm"|"md"|"lg"; };

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
export default function Button({ variant="gradient", size="md", className="", ...rest }: Props) {
  const base = "inline-flex items-center justify-center rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-4 text-lg" }[size];
  const variants = {
    gradient: "text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105",
    outline: "text-gray-700 border border-gray-400 hover:bg-gray-100 hover:scale-105", // Changed
    ghost: "text-gray-700/90 hover:bg-gray-100", // Changed
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...rest} />;
}