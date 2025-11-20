// src/features/auth/ConfirmForm.tsx
import React from 'react';

type Props = {
    confirmCode: string;
    errors: Record<string, string>;
    isLoading: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onResend: () => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const ConfirmForm: React.FC<Props> = ({ confirmCode, errors, isLoading, onChange, onSubmit, onResend }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mã xác nhận</label> 
            <input
                type="text"
                value={confirmCode}
                onChange={onChange}
                className={`w-full px-4 py-3 rounded-lg bg-gray-100/10 border ${errors.confirmCode ? 'border-red-500' : 'border-gray-300'} text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center tracking-[0.5em]`}
                placeholder="------"
            />
            {errors.confirmCode && <p className="text-red-400 text-sm mt-1">{errors.confirmCode}</p>}
        </div>
        <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
        </button>
        <button
            type="button"
            onClick={onResend}
            disabled={isLoading}
            className="w-full text-blue-500 hover:text-blue-400 text-sm"
        >
            Gửi lại mã
        </button>
    </form>
);

export default ConfirmForm;