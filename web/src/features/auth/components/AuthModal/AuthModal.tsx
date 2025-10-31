// src/features/auth/components/AuthModal/AuthModal.tsx
/**
 * Component Modal chính cho Authentication (Login, Register, Forgot, Confirm).
 * Tái cấu trúc từ `features/auth/AuthModal.tsx` cũ.
 * Sử dụng `core/components/Modal` và các form component mới.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as authApi from '../../services/authApi';
import { getGoogleLoginUrl } from '../../services/cognito';
import Modal from '../../../../core/components/Modal/Modal';
import Button from '../../../../core/components/Button/Button';
import LogoHeader from '../LogoHeader';
import MessageDisplay from '../MessageDisplay';
import GoogleLoginButton from '../GoogleLoginButton';
import ModeToggle from '../ModeToggle';
import LoginForm from '../LoginForm';
import RegisterForm from '../RegisterForm';
import ConfirmForm from '../ConfirmForm';
import ForgotForm from '../ForgotForm';
import ResetForm from '../ResetForm';

type AuthMode = 'login' | 'register' | 'confirm' | 'forgot' | 'reset';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<Props> = ({ isOpen, onClose, initialMode = 'login' }) => {
    const { setAuthTokens } = useAuth();
    
    // --- State Management ---
    const [mode, setMode] = useState<AuthMode>(initialMode);
    // State cho email/username dùng chung
    const [username, setUsername] = useState(''); 
    // State cho các form
    const [loginData, setLoginData] = useState({ password: '' });
    const [registerData, setRegisterData] = useState({ password: '', confirmPassword: '' });
    const [confirmCode, setConfirmCode] = useState('');
    const [resetData, setResetData] = useState({ code: '', newPassword: '' });
    
    // State UI
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [infoMessage, setInfoMessage] = useState('');

    // --- State Reset Logic ---
    const resetFormStates = useCallback(() => {
        setLoginData({ password: '' });
        setRegisterData({ password: '', confirmPassword: '' });
        setConfirmCode('');
        setResetData({ code: '', newPassword: '' });
        setErrors({});
        setInfoMessage('');
        setIsLoading(false);
        setIsResending(false);
    }, []);

    // Reset khi modal mở hoặc mode thay đổi
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            resetFormStates();
            // Không reset username nếu chuyển từ login -> confirm
            if (initialMode === 'login' || initialMode === 'register') {
                 setUsername('');
            }
        }
    }, [isOpen, initialMode, resetFormStates]);

    const handleModeChange = (newMode: AuthMode) => {
        setMode(newMode);
        resetFormStates();
        // Không reset username nếu chuyển từ forgot -> reset
        if (newMode === 'login' || newMode === 'register') {
            setUsername('');
        }
    };

    // --- Form Change Handlers ---
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.name === 'email') setUsername(e.target.value);
        else setLoginData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.name === 'email') setUsername(e.target.value);
        else setRegisterData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    // --- Validation Logic ---
    const validate = (currentMode: AuthMode): boolean => {
         setErrors({});
         if (currentMode === 'register') {
             if (registerData.password.length < 8) {
                 setErrors({ password: 'Mật khẩu phải có ít nhất 8 ký tự.' }); return false;
             }
             if (registerData.password !== registerData.confirmPassword) {
                 setErrors({ confirmPassword: 'Mật khẩu xác nhận không khớp.' }); return false;
             }
         }
         if (currentMode === 'reset') {
             if (resetData.newPassword.length < 8) {
                 setErrors({ newPassword: 'Mật khẩu mới phải có ít nhất 8 ký tự.' }); return false;
             }
         }
         return true;
    };

    // --- API Handlers (User Stories #24, #25) ---

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate('login')) return;
        setIsLoading(true); setInfoMessage(''); setErrors({});

        try {
            // DÙNG API CUSTOM CỦA BE (NẾU CÓ)
            // const { tokens, user } = await authApi.loginUser(username, loginData.password);
            // setAuthTokens(tokens);

            // TẠM THỜI (Giả sử API login BE chưa có):
            // Giả lập lỗi "User is not confirmed"
            if (username === "test@test.com") {
                setErrors({ general: 'Đăng nhập thất bại. (Test)' });
            } else {
                 setInfoMessage("Đang chuyển đến Cognito...");
                 // (Code cũ của bạn có vẻ gọi thẳng Cognito - điều này không an toàn cho email/pass)
                 // (Chúng ta sẽ giả định BE có /api/auth/login)
                 throw new Error("API /api/auth/login chưa được triển khai!");
            }

            // onClose();
        } catch (err: any) {
             const errorMsg = err.response?.data?.error || err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
             // Xử lý lỗi "User is not confirmed" (User Story #24)
             if (errorMsg.includes('User is not confirmed')) {
                 setInfoMessage('Tài khoản của bạn chưa được xác nhận. Vui lòng nhập mã.');
                 setMode('confirm');
                 // Tự động gửi lại mã
                 handleResend(true); // true = silent resend
             } else {
                 setErrors({ general: errorMsg });
             }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate('register')) return;
        setIsLoading(true); setInfoMessage(''); setErrors({});

        try {
            await authApi.registerUser(username, registerData.password);
            setInfoMessage('Đăng ký thành công! Mã xác nhận đã được gửi đến email của bạn.');
            setMode('confirm');
        } catch (err: any) {
            setErrors({ general: err.response?.data?.error || err.message || 'Đăng ký thất bại. Email có thể đã tồn tại.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate('confirm')) return;
        setIsLoading(true); setInfoMessage(''); setErrors({});

        try {
            await authApi.confirmSignup(username, confirmCode);
            setInfoMessage('Xác nhận thành công! Bây giờ bạn có thể đăng nhập.');
            setMode('login');
            setLoginData({ password: '' }); // Xóa password
        } catch (err: any) {
            setErrors({ general: err.response?.data?.error || err.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResend = async (silent = false) => {
        if (!username) {
             if (!silent) setErrors({ general: 'Vui lòng nhập email trước khi gửi lại mã.' });
             return;
        }
        setIsResending(true); setInfoMessage(''); setErrors({});
        try {
            await authApi.resendConfirmationCode(username);
            setInfoMessage('Đã gửi lại mã xác nhận thành công!');
        } catch (err: any) {
             setErrors({ general: err.response?.data?.error || err.message || 'Không thể gửi lại mã. Vui lòng thử lại sau.' });
        } finally {
            setIsResending(false);
        }
    };
    
    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate('forgot')) return;
        setIsLoading(true); setInfoMessage(''); setErrors({});

        try {
            await authApi.startForgotPassword(username);
            setInfoMessage('Thành công! Vui lòng kiểm tra email để lấy mã khôi phục.');
            setMode('reset');
        } catch (err: any) {
             setErrors({ general: err.response?.data?.error || err.message || 'Email không tồn tại hoặc có lỗi xảy ra.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate('reset')) return;
        setIsLoading(true); setInfoMessage(''); setErrors({});
        
        try {
            await authApi.confirmResetPassword(username, resetData.code, resetData.newPassword);
            setInfoMessage('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
            setMode('login');
            setLoginData({ password: '' });
        } catch (err: any) {
             setErrors({ general: err.response?.data?.error || err.message || 'Mã khôi phục không hợp lệ hoặc đã hết hạn.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => { // User Story #27
        setIsLoading(true);
        // Chuyển hướng đến Cognito Hosted UI
        window.location.href = getGoogleLoginUrl();
    };

    // --- Render Logic ---
    const renderForm = () => {
        switch (mode) {
            case 'login':
                return <LoginForm formData={{ email: username, password: loginData.password }} errors={errors} handleChange={handleLoginChange} isLoading={isLoading} onSubmit={handleLogin} onForgot={() => handleModeChange('forgot')} />;
            case 'register':
                return <RegisterForm formData={{ email: username, ...registerData }} errors={errors} handleChange={handleRegisterChange} isLoading={isLoading} onSubmit={handleRegister} />;
            case 'confirm':
                return <ConfirmForm confirmCode={confirmCode} errors={errors} isLoading={isLoading} onChange={e => setConfirmCode(e.target.value)} onSubmit={handleConfirm} onResend={handleResend} isResending={isResending} />;
            case 'forgot':
                return <ForgotForm formData={{ email: username }} errors={errors} isLoading={isLoading} onChange={e => setUsername(e.target.value)} onSubmit={handleForgot} />;
            case 'reset':
                return <ResetForm resetCode={resetData.code} newPassword={resetData.newPassword} errors={errors} isLoading={isLoading} onChangeCode={e => setResetData(p => ({ ...p, code: e.target.value }))} onChangePassword={e => setResetData(p => ({ ...p, newPassword: e.target.value }))} onSubmit={handleReset} />;
            default:
                return null;
        }
    };

    // Tiêu đề modal dựa trên mode
    const modalTitle = useMemo(() => {
        switch (mode) {
            case 'login': return 'Đăng nhập';
            case 'register': return 'Tạo tài khoản';
            case 'confirm': return 'Xác nhận Email';
            case 'forgot': return 'Quên Mật khẩu';
            case 'reset': return 'Đặt lại Mật khẩu';
        }
    }, [mode]);

    return (
        <Modal isOpen={isOpen} onClose={() => { if (!isLoading) onClose(); }} title={modalTitle} size="sm">
            {/* Ẩn LogoHeader nếu là confirm/forgot/reset */}
            {/* {(mode === 'login' || mode === 'register') && <LogoHeader />} */}
            
            <MessageDisplay infoMessage={infoMessage} errorMessage={errors.general} />
            
            <div className="mt-4">
                {renderForm()}
            </div>
            
            {(mode === 'login' || mode === 'register') && (
                <>
                    <div className="my-5 flex items-center">
                        <div className="flex-1 border-t border-gray-600" />
                        <span className="px-3 text-gray-500 text-xs uppercase">Hoặc</span>
                        <div className="flex-1 border-t border-gray-600" />
                    </div>
                    <GoogleLoginButton onClick={handleGoogleLogin} isLoading={isLoading} />
                </>
            )}

            {(mode === 'login' || mode === 'register') && <ModeToggle mode={mode} onModeChange={handleModeChange} />}
            
            {(mode === 'confirm' || mode === 'forgot' || mode === 'reset') && (
                 <div className="mt-6 text-center">
                    <button 
                        type="button"
                        onClick={() => handleModeChange('login')} 
                        className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none focus:underline text-sm"
                    >
                        Quay lại Đăng nhập
                    </button>
                 </div>
            )}
        </Modal>
    );
};

export default AuthModal;
