// src/features/auth/RegisterForm.tsx
import React, { useMemo, useState } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';

// Password requirements checker
const PASSWORD_REQUIREMENTS = [
    { label: 'Ít nhất 8 ký tự', regex: /.{8,}/ },
    { label: 'Chứa chữ hoa (A-Z)', regex: /[A-Z]/ },
    { label: 'Chứa chữ thường (a-z)', regex: /[a-z]/ },
    { label: 'Chứa số (0-9)', regex: /[0-9]/ },
    { label: 'Chứa ký tự đặc biệt (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
];

type Props = {
    formData: { email: string; password: string; confirmPassword: string };
    errors: Record<string, string>;
    showPassword: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleShowPassword: () => void;
    isLoading: boolean;
    onSubmit: (e: React.FormEvent) => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const RegisterForm: React.FC<Props> = ({ formData, errors, showPassword, handleChange, toggleShowPassword, isLoading, onSubmit }) => {
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Check password requirements
    const passwordRequirements = useMemo(() => {
        return PASSWORD_REQUIREMENTS.map(req => ({
            ...req,
            met: req.regex.test(formData.password)
        }));
    }, [formData.password]);

    const allRequirementsMet = passwordRequirements.every(req => req.met);
    const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

    return (
    <form onSubmit={onSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label> 
            <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg bg-gray-100/10 border ${errors.email ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Nhập email của bạn"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
             <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 pr-10 rounded-lg bg-gray-100/10 border ${errors.password ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    placeholder="Nhập mật khẩu"
                />
                                 <button
                                    type="button"
                                    onClick={toggleShowPassword}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button> 
            </div>
            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            
                        {/* Password requirements - show when focused */}
                        {focusedField === 'password' && formData.password && (
                            <div className="mt-3 p-3 bg-gray-100 rounded-lg border border-gray-300 space-y-2">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Yêu cầu mật khẩu:</p>
                                {passwordRequirements.map((req, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        {req.met ? (
                                            <Check size={16} className="text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X size={16} className="text-red-400 flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${req.met ? 'text-green-600 font-medium' : 'text-red-500'}`}>
                                            {req.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu</label>
                        <div className="relative">
                            <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                                className={`w-full px-4 py-3 pr-10 rounded-lg bg-gray-100/10 border ${
                                    errors.confirmPassword 
                                        ? 'border-red-500' 
                                        : formData.confirmPassword && formData.password !== formData.confirmPassword
                                            ? 'border-red-400'
                                            : passwordsMatch
                                                ? 'border-green-400'
                                                : 'border-gray-300'
                                } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Nhập lại mật khẩu"
            />
                            {passwordsMatch && (
                                <Check size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                            )}
                        </div>
            {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>
        <button
            type="submit"
                        disabled={isLoading || !allRequirementsMet || !passwordsMatch}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
    </form>
    );
};

export default RegisterForm;
