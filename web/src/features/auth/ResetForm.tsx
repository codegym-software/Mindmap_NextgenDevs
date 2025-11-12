// src/features/auth/ResetForm.tsx
import React from 'react';

type Props = {
    resetCode: string;
    newPassword: string;
    errors: Record<string, string>;
    showPassword: boolean;
    toggleShowPassword: () => void;
    isLoading: boolean;
    onChangeCode: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onChangePassword: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const ResetForm: React.FC<Props> = ({ resetCode, newPassword, errors, showPassword, toggleShowPassword, isLoading, onChangeCode, onChangePassword, onSubmit }) => (
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
                    className={`w-full px-4 py-3 pr-10 rounded-lg bg-gray-100/10 border ${errors.newPassword ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    placeholder="Nhập mật khẩu mới"
                />
                 <button type="button" onClick={toggleShowPassword} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900 text-xs">{showPassword ? 'Ẩn' : 'Hiện'}</button> 
            </div>
            {errors.newPassword && <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>}
        </div>
        <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>
    </form>
);

export default ResetForm;