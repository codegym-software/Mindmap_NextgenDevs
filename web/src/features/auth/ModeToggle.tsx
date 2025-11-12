// src/features/auth/ModeToggle.tsx
import React from 'react';

type Props = {
    mode: 'login' | 'register';
    onModeChange: (newMode: 'login' | 'register') => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const ModeToggle: React.FC<Props> = ({ mode, onModeChange }) => (
    <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm"> 
            {mode === 'login' ? (
                <>
                    Chưa có tài khoản?{' '}
                    <button onClick={() => onModeChange('register')} className="text-blue-500 hover:text-blue-400 font-medium"> 
                        Đăng ký ngay
                    </button>
                </>
            ) : (
                <>
                    Đã có tài khoản?{' '}
                    <button onClick={() => onModeChange('login')} className="text-blue-500 hover:text-blue-400 font-medium"> 
                        Đăng nhập
                    </button>
                </>
            )}
        </p>
    </div>
);

export default ModeToggle;