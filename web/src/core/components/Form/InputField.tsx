/**
 * Component Input dùng chung cho các form.
 * Tích hợp label, xử lý lỗi, và icon.
 */
import React, { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    error?: string;
    icon?: React.ReactNode; // Icon bên trái (e.g., Email, Lock)
}

const InputField: React.FC<InputFieldProps> = ({
    label,
    id,
    type = 'text',
    error,
    icon,
    className = '',
    ...props
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (isPasswordVisible ? 'text' : 'password') : type;

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
                {label}
            </label>
            <div className="relative">
                {/* Icon bên trái */}
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
                    </div>
                )}
                
                <input
                    id={id}
                    type={inputType}
                    className={
                        `w-full px-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10
                        transition-all duration-200
                        ${icon ? 'pl-10' : ''}
                        ${isPassword ? 'pr-10' : ''}
                        ${error ? 'border-red-500/70 focus:ring-red-500' : 'border-white/20'}
                        ${className}`
                    }
                    {...props}
                />
                
                {/* Nút Ẩn/Hiện mật khẩu */}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                        aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                        {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {/* Thông báo lỗi */}
            {error && (
                <p className="text-red-400 text-xs mt-1.5">{error}</p>
            )}
        </div>
    );
};

export default InputField;
