// src/features/auth/ChangePasswordModal.tsx
import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import * as cognitoDirect from '../../auth/cognitoDirect';
import { useToast } from '../../hooks/useToast';
import LogoHeader from './LogoHeader';
import MessageDisplay from './MessageDisplay';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// Password requirements checker
const PASSWORD_REQUIREMENTS = [
  { label: 'Ít nhất 8 ký tự', regex: /.{8,}/ },
  { label: 'Chứa chữ hoa (A-Z)', regex: /[A-Z]/ },
  { label: 'Chứa chữ thường (a-z)', regex: /[a-z]/ },
  { label: 'Chứa số (0-9)', regex: /[0-9]/ },
  { label: 'Chứa ký tự đặc biệt (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
];

const ChangePasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [infoMessage, setInfoMessage] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Check password requirements
  const passwordRequirements = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      met: req.regex.test(formData.newPassword)
    }));
  }, [formData.newPassword]);

  if (!isOpen) return null;

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }
    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    }
    if (!allRequirementsMet) {
      newErrors.newPassword = 'Mật khẩu không đáp ứng tất cả các yêu cầu';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    setInfoMessage('');
    
    try {
      await cognitoDirect.changePassword(formData.oldPassword, formData.newPassword);
      addToast('Đổi mật khẩu thành công!', 'success');
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      onClose();
    } catch (err: any) {
      let message = 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      
      if (err.name === 'NotAuthorizedException') {
        message = 'Mật khẩu hiện tại không đúng.';
      } else if (err.name === 'InvalidPasswordException') {
        message = 'Mật khẩu mới không đủ mạnh. Phải có chữ hoa, chữ thường, số và ký tự đặc biệt.';
      } else if (err.name === 'LimitExceededException') {
        message = 'Quá nhiều lần thử. Vui lòng đợi một lúc.';
      } else if (err.message) {
        message = err.message;
      }
      
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    setInfoMessage('');
    setShowPasswords({ old: false, new: false, confirm: false });
    setFocusedField(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
      onClick={handleClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-100">
          <LogoHeader />
          <MessageDisplay infoMessage={infoMessage} errorMessage={errors.general} />
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showPasswords.old ? 'text' : 'password'}
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('oldPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all outline-none
                    ${errors.oldPassword 
                      ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-200' 
                      : 'border-ink-100 bg-mist-50/50 focus:ring-2 focus:ring-aurora-200 focus:border-aurora-400'
                    }`}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.oldPassword && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <X size={14} /> {errors.oldPassword}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all outline-none
                    ${errors.newPassword 
                      ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-200' 
                      : 'border-ink-100 bg-mist-50/50 focus:ring-2 focus:ring-aurora-200 focus:border-aurora-400'
                    }`}
                  placeholder="Nhập mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <X size={14} /> {errors.newPassword}
                </p>
              )}
              {focusedField === 'newPassword' && formData.newPassword && (
                <div className="mt-3 p-3 bg-mist-50 rounded-lg border border-ink-100 space-y-2">
                  <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide">Yêu cầu mật khẩu:</p>
                  {passwordRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {req.met ? (
                        <Check size={16} className="text-jade-500 flex-shrink-0" />
                      ) : (
                        <X size={16} className="text-red-400 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${req.met ? 'text-jade-600 font-medium' : 'text-red-500'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all outline-none
                    ${errors.confirmPassword 
                      ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-200' 
                      : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                      ? 'border-jade-400 bg-jade-50/50 focus:ring-2 focus:ring-jade-200'
                      : 'border-ink-100 bg-mist-50/50 focus:ring-2 focus:ring-aurora-200 focus:border-aurora-400'
                    }`}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                  <Check size={18} className="absolute right-10 top-1/2 -translate-y-1/2 text-jade-500" />
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <X size={14} /> {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-ink-200 rounded-lg text-ink-700 font-medium hover:bg-ink-50 transition-all"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading || !allRequirementsMet || !formData.confirmPassword}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all
                  ${isLoading || !allRequirementsMet || !formData.confirmPassword
                    ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-aurora-500 to-blush-500 text-white hover:shadow-elevation-soft active:scale-95'
                  }`}
              >
                {isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
