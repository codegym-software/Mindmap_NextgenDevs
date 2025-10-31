// src/features/auth/components/RegisterForm.tsx
/**
 * Form Đăng ký, sử dụng InputField component.
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import Button from '../../../core/components/Button/Button';
import InputField from '../../../core/components/Form/InputField';
import { Mail, Lock } from 'lucide-react';

type Props = {
    formData: { email: string; password: string; confirmPassword: string };
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    onSubmit: (e: React.FormEvent) => void;
};

const RegisterForm: React.FC<Props> = ({ formData, errors, handleChange, isLoading, onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-5">
        <InputField
            id="register-email"
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            icon={<Mail />}
            placeholder="ban@email.com"
            required
            autoComplete="email"
        />
        
        <InputField
            id="register-password"
            name="password"
            label="Mật khẩu"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock />}
            placeholder="Tối thiểu 8 ký tự"
            required
            autoComplete="new-password"
        />
        
        <InputField
            id="register-confirmPassword"
            name="confirmPassword"
            label="Xác nhận Mật khẩu"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            icon={<Lock />}
            placeholder="Nhập lại mật khẩu"
            required
            autoComplete="new-password"
        />

        <p className="text-xs text-gray-500 -mt-2">
            Bằng cách đăng ký, bạn đồng ý với Điều khoản Dịch vụ của chúng tôi.
        </p>

        <Button
            type="submit"
            size="lg"
            className="w-full !py-2.5"
            isLoading={isLoading}
            disabled={isLoading}
        >
            Đăng ký
        </Button>
    </form>
);

export default RegisterForm;
