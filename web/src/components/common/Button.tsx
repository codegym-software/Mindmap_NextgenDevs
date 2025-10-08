import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gradient" | "outline" | "ghost"; size?: "sm"|"md"|"lg"; };
export default function Button({ variant="gradient", size="md", className="", ...rest }: Props) {
  const base = "inline-flex items-center justify-center rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-4 text-lg" }[size];
  const variants = {
    gradient: "text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105",
    outline: "text-white border border-white/30 hover:bg-gray-700/50 hover:scale-105",
    ghost: "text-white/90 hover:bg-gray-800",
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...rest} />;
}
