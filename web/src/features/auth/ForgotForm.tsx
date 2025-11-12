// src/features/auth/ForgotForm.tsx
import React from 'react';

type Props = {
    formData: { email: string };
    errors: Record<string, string>;
    isLoading: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const ForgotForm: React.FC<Props> = ({ formData, errors, isLoading, onChange, onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <p className="text-center text-gray-700">Nhập email của bạn để nhận mã khôi phục mật khẩu.</p> 
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label> 
            <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                className={`w-full px-4 py-3 rounded-lg bg-gray-100/10 border ${errors.email ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Nhập email của bạn"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
        </div>
        <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Đang gửi...' : 'Gửi mã khôi phục'}
        </button>
    </form>
);

export default ForgotForm;