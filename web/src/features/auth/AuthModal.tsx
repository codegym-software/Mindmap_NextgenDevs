// src/features/auth/AuthModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as cognitoDirect from '../../auth/cognitoDirect';
import { getGoogleLoginUrl } from '../../services/AuthApi';
import { Tokens } from '../../services/authStorage';
import LogoHeader from './LogoHeader';
import MessageDisplay from './MessageDisplay';
import GoogleLoginButton from './GoogleLoginButton';
import ModeToggle from './ModeToggle';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ConfirmForm from './ConfirmForm';
import ForgotForm from './ForgotForm';
import ResetForm from './ResetForm';
import api from '../../services/api'; // Import API để gọi sync

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
};

type AuthMode = 'login' | 'register' | 'confirm' | 'forgot' | 'reset';

const AuthModal: React.FC<Props> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { setAuthTokens } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [confirmCode, setConfirmCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [infoMessage, setInfoMessage] = useState('');
  const [usernameForConfirm, setUsernameForConfirm] = useState('');

  const resetState = useCallback(() => {
    setFormData({ email: '', password: '', confirmPassword: '' });
    setConfirmCode('');
    setResetCode('');
    setNewPassword('');
    setShowPassword(false);
    setIsLoading(false);
    setErrors({});
    setInfoMessage('');
    setUsernameForConfirm('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetState();
    }
  }, [isOpen, initialMode, resetState]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (errors.general) setErrors((prev) => ({ ...prev, general: ''}));
  };
  
  const validateForm = () => {
    if (mode === 'register' && formData.password !== formData.confirmPassword) {
        setErrors({ general: "Mật khẩu xác nhận không khớp." });
        return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    
    try {
        // 1. Login bằng SDK Cognito
        const session = await cognitoDirect.signIn(formData.email, formData.password);
        
        const tokens: Tokens = {
            id_token: session.getIdToken().getJwtToken(),
            access_token: session.getAccessToken().getJwtToken(),
            refresh_token: session.getRefreshToken().getToken(),
            expires_at: session.getIdToken().getExpiration(), 
        };
        
        // 2. Lưu token (Lúc này API Interceptor đã có token để dùng)
        setAuthTokens(tokens);

        // 3. [QUAN TRỌNG] Gọi sync user ngay
        try {
            await api.post("/users/sync-cognito");
            console.log("Synced user successfully");
        } catch (syncErr) {
            console.error("Sync user warning:", syncErr);
            // Không block login nếu sync lỗi, nhưng nên log để debug
        }

        onClose();
    } catch (err: any) {
        if (err.name === 'UserNotConfirmedException') {
            setUsernameForConfirm(formData.email);
            setInfoMessage('Tài khoản của bạn chưa được xác nhận. Vui lòng nhập mã.');
            setMode('confirm');
            try {
              await cognitoDirect.resendConfirmationCode(formData.email);
            } catch (resendErr: any) {
              setErrors({ general: resendErr.message || "Gửi lại mã thất bại." });
            }
        } else if (err.name === 'UserNotFoundException' || err.name === 'NotAuthorizedException') {
            setErrors({ general: 'Email hoặc mật khẩu không chính xác.' });
        } else {
            setErrors({ general: err.message || 'Có lỗi xảy ra, vui lòng thử lại.' });
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
        const { user, username } = await cognitoDirect.signUp(formData.email, formData.password);
        console.log("Register success", user);
        setUsernameForConfirm(username);
        setInfoMessage('Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập vào bên dưới.');
        setMode('confirm');
    } catch (err: any) {
        console.error("Register failed", err);
        let message = 'Đăng ký thất bại. Vui lòng thử lại.';
        if (err.name === 'InvalidPasswordException') {
            message = 'Mật khẩu không đủ mạnh. Phải có chữ hoa, chữ thường, số, và ký tự đặc biệt.';
        } else if (err.name === 'UsernameExistsException') {
             message = 'Email này đã được đăng ký.';
        } else if (err.name === 'InvalidParameterException') {
             message = 'Email không đúng định dạng hoặc có vấn đề.';
        } else if (err.message) {
            message = err.message;
        }
        setErrors({ general: message });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
        await cognitoDirect.confirmSignUp(usernameForConfirm, confirmCode);
        setInfoMessage('Xác nhận thành công! Bây giờ bạn có thể đăng nhập.');
        setMode('login');
        // Không xóa usernameForConfirm ngay để user đỡ phải gõ lại email nếu muốn login ngay
    } catch (err: any) {
        let message = 'Mã xác nhận không hợp lệ.';
        if (err.name === 'CodeMismatchException') {
            message = 'Mã xác nhận không đúng. Vui lòng thử lại.';
        } else if (err.name === 'ExpiredCodeException') {
            message = 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.';
        } else if (err.message) {
            message = err.message;
        }
        setErrors({ general: message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if(!usernameForConfirm) {
        setErrors({ general: 'Không tìm thấy email/username để gửi lại mã.'});
        return;
    }
    setIsLoading(true);
    setErrors({});
    try {
        await cognitoDirect.resendConfirmationCode(usernameForConfirm);
        setInfoMessage('Đã gửi lại mã xác nhận thành công!');
    } catch (err: any) {
        setErrors({ general: err.message || 'Không thể gửi lại mã.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
        await cognitoDirect.forgotPassword(formData.email);
        setInfoMessage('Mã khôi phục đã được gửi đến email của bạn.');
        setMode('reset');
    } catch (err: any) {
        setErrors({ general: err.message || 'Lỗi khi yêu cầu khôi phục mật khẩu.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
        await cognitoDirect.confirmResetPassword(formData.email, resetCode, newPassword);
        setInfoMessage('Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.');
        setMode('login');
    } catch (err: any) {
        setErrors({ general: err.message || 'Lỗi khi đặt lại mật khẩu.' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleModeChange = (newMode: AuthMode) => {
      setMode(newMode);
      setErrors({});
      setInfoMessage('');
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-100">
            <LogoHeader />
            <MessageDisplay infoMessage={infoMessage} errorMessage={errors.general} />
            
            {mode === 'login' && <LoginForm formData={formData} errors={errors} showPassword={showPassword} handleChange={handleChange} toggleShowPassword={() => setShowPassword(!showPassword)} isLoading={isLoading} onSubmit={handleLogin} onForgot={() => handleModeChange('forgot')} />}
            {mode === 'register' && <RegisterForm formData={formData} errors={errors} showPassword={showPassword} handleChange={handleChange} toggleShowPassword={() => setShowPassword(!showPassword)} isLoading={isLoading} onSubmit={handleRegister} />}
            {mode === 'confirm' && <ConfirmForm confirmCode={confirmCode} errors={errors} isLoading={isLoading} onChange={e => setConfirmCode(e.target.value)} onSubmit={handleConfirm} onResend={handleResend} />}
            {mode === 'forgot' && <ForgotForm formData={formData} errors={errors} isLoading={isLoading} onChange={handleChange} onSubmit={handleForgot} />}
            {mode === 'reset' && <ResetForm resetCode={resetCode} newPassword={newPassword} errors={errors} showPassword={showPassword} toggleShowPassword={() => setShowPassword(!showPassword)} isLoading={isLoading} onChangeCode={e => setResetCode(e.target.value)} onChangePassword={e => setNewPassword(e.target.value)} onSubmit={handleReset} />}

            {(mode === 'login' || mode === 'register') && (
                <>
                   <div className="my-6 flex items-center">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-gray-500 text-sm">hoặc</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>
                    <GoogleLoginButton onClick={handleGoogleLogin} />
                </>
            )}
            
            {(mode === 'login' || mode === 'register') && <ModeToggle mode={mode} onModeChange={handleModeChange} />}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;