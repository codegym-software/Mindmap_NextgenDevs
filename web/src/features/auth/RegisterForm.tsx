// src/features/auth/RegisterForm.tsx
import React from 'react';

type Props = {
    formData: { email: string; password: string; confirmPassword: string };
    errors: Record<string, string>;
    showPassword: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleShowPassword: () => void;
    isLoading: boolean;
    onSubmit: (e: React.FormEvent) => void;
};

const RegisterForm: React.FC<Props> = ({ formData, errors, showPassword, handleChange, toggleShowPassword, isLoading, onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg bg-white/10 border ${errors.email ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Nhập email của bạn"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mật khẩu</label>
             <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-10 rounded-lg bg-white/10 border ${errors.password ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    placeholder="Tối thiểu 8 ký tự, có chữ hoa, số, ký tự đặc biệt"
                />
                 <button type="button" onClick={toggleShowPassword} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-xs">{showPassword ? 'Ẩn' : 'Hiện'}</button>
            </div>
            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Xác nhận mật khẩu</label>
            <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg bg-white/10 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Nhập lại mật khẩu"
            />
            {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>
        <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
    </form>
);

export default RegisterForm;
