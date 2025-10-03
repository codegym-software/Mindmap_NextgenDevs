import React from 'react';

const ModeToggle = ({ mode, onModeChange }) => (
    <div className="mt-6 text-center">
        <p className="text-gray-300">
            {mode === 'login' ? (
                <>
                    Chưa có tài khoản?{' '}
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            onModeChange('register');
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        Đăng ký ngay
                    </a>
                </>
            ) : (
                <>
                    Đã có tài khoản?{' '}
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            onModeChange('login');
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        Đăng nhập
                    </a>
                </>
            )}
        </p>
    </div>
);

export default ModeToggle;