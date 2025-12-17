// src/features/auth/ResetForm.tsx
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
    resetCode: string;
    newPassword: string;
    confirmNewPassword: string;
    errors: Record<string, string>;
    showPassword: boolean;
    toggleShowPassword: () => void;
    isLoading: boolean;
    onChangeCode: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onChangePassword: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onChangeConfirm: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const ResetForm: React.FC<Props> = ({ resetCode, newPassword, confirmNewPassword, errors, showPassword, toggleShowPassword, isLoading, onChangeCode, onChangePassword, onChangeConfirm, onSubmit }) => {
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const passwordRequirements = useMemo(() => PASSWORD_REQUIREMENTS.map(req => ({
        ...req,
        met: req.regex.test(newPassword)
    })), [newPassword]);

    const allRequirementsMet = passwordRequirements.every(req => req.met);
    const passwordsMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mã khôi phục</label> 
                <input
                    type="text"
                    value={resetCode}
                    onChange={onChangeCode}
                    className={`w-full px-4 py-3 rounded-lg bg-gray-100/10 border ${errors.resetCode ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center tracking-[0.5em]`}
                    placeholder="------"
                />
                {errors.resetCode && <p className="text-red-400 text-sm mt-1">{errors.resetCode}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label> 
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={onChangePassword}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full px-4 py-3 pr-10 rounded-lg bg-gray-100/10 border ${errors.newPassword ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                        placeholder="Nhập mật khẩu mới"
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
                {errors.newPassword && <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>}

                {focusedField === 'password' && newPassword && (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu mới</label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={onChangeConfirm}
                        className={`w-full px-4 py-3 pr-10 rounded-lg bg-gray-100/10 border ${
                            errors.confirmNewPassword
                                ? 'border-red-500'
                                : confirmNewPassword && !passwordsMatch
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
                {errors.confirmNewPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmNewPassword}</p>}
            </div>
            <button
                type="submit"
                disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
        </form>
    );
};

export default ResetForm;
