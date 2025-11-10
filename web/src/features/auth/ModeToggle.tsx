// src/features/auth/ModeToggle.tsx
import React from 'react';

type Props = {
    mode: 'login' | 'register';
    // FIX: Kiểu dữ liệu của onModeChange cần phải là (AuthMode) => void
    // Nhưng để đơn giản, ta chỉ cần truyền 'login' hoặc 'register'
    onModeChange: (newMode: 'login' | 'register') => void;
};

const ModeToggle: React.FC<Props> = ({ mode, onModeChange }) => (
    <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
            {mode === 'login' ? (
                <>
                    Chưa có tài khoản?{' '}
                    <button onClick={() => onModeChange('register')} className="text-blue-400 hover:text-blue-300 font-medium">
                        Đăng ký ngay
                    </button>
                </>
            ) : (
                <>
                    Đã có tài khoản?{' '}
                    <button onClick={() => onModeChange('login')} className="text-blue-400 hover:text-blue-300 font-medium">
                        Đăng nhập
                    </button>
                </>
            )}
        </p>
    </div>
);

export default ModeToggle;
