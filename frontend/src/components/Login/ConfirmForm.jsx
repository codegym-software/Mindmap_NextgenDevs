import React from 'react';

const ConfirmForm = ({ confirmCode, errors, isLoading, onChange, onSubmit, onResend }) => (
    <form onSubmit={onSubmit} className="space-y-8">
        <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
                <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mã xác nhận
            </label>
            <input
                type="text"
                value={confirmCode}
                onChange={onChange}
                className={`w-full px-5 py-4 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg ${errors.confirmCode ? 'border-red-400' : ''}`}
                placeholder="Nhập mã xác nhận"
            />
            {errors.confirmCode && (
                <p className="text-red-400 text-sm mt-1 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.confirmCode}
                </p>
            )}
        </div>
        <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-lg"
        >
            {isLoading ? (
                <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Đang xác nhận...
                </>
            ) : (
                'Xác nhận'
            )}
        </button>
        <button
            onClick={onResend}
            disabled={isLoading}
            className="w-full text-blue-400 hover:text-blue-300 text-sm transition-colors mt-2"
        >
            Gửi lại mã xác nhận
        </button>
    </form>
);

export default ConfirmForm;