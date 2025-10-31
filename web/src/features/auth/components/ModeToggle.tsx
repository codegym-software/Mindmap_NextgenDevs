// src/features/auth/components/ModeToggle.tsx
/**
 * Nút chuyển đổi giữa Login và Register trong AuthModal.
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';

type Props = {
    mode: 'login' | 'register';
    onModeChange: (newMode: 'login' | 'register') => void;
};

const ModeToggle: React.FC<Props> = ({ mode, onModeChange }) => (
    <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
            {mode === 'login' ? (
                <>
                    Chưa có tài khoản?{' '}
                    <button 
                        type="button"
                        onClick={() => onModeChange('register')} 
                        className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none focus:underline"
                    >
                        Đăng ký ngay
                    </button>
                </>
            ) : (
                <>
                    Đã có tài khoản?{' '}
                    <button 
                        type="button"
                        onClick={() => onModeChange('login')} 
                        className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none focus:underline"
                    >
                        Đăng nhập
                    </button>
                </>
            )}
        </p>
    </div>
);

export default ModeToggle;
