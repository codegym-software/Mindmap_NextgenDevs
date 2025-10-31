/**
 * Component Button dùng chung, tái cấu trúc từ code cũ.
 * Sử dụng Tailwind, hỗ trợ các variants và sizes.
 */
import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

// --- Định nghĩa Variants cho Button (Sử dụng CVA) ---
const buttonVariants = cva(
    // Base styles
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 outline-none",
    // Compound styles for focus
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-gray-900",
    // Disabled styles
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:saturate-50",
    {
        variants: {
            variant: {
                // User Story #1: Nút nổi bật
                gradient: "text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-[0.98] shadow-lg hover:shadow-blue-500/30",
                // Nút phụ (e.g., Hủy)
                outline: "text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700/80 active:bg-gray-700",
                // Nút trong toolbar
                ghost: "text-gray-300 hover:bg-gray-700/80 hover:text-white active:bg-gray-700",
                // Nút xóa (User Story #3)
                danger: "text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-lg hover:shadow-red-500/30",
            },
            size: {
                sm: "px-3 py-1.5 text-sm",
                md: "px-4 py-2 text-sm font-semibold", // Default
                lg: "px-6 py-3 text-base font-semibold", // User Story #1: Nút "Bắt đầu"
                icon: "h-9 w-9 p-0", // Cho các nút toolbar
            },
        },
        defaultVariants: {
            variant: "gradient",
            size: "md",
        },
    }
);

// --- Props Interface ---
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    // asChild?: boolean; // (Tùy chọn nếu dùng Slot)
}

// --- Component ---
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={twMerge(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export default Button;
