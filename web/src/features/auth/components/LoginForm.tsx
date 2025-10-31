// src/features/auth/components/LoginForm.tsx
/**
 * Form Đăng nhập, sử dụng InputField component.
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import Button from '../../../core/components/Button/Button';
import InputField from '../../../core/components/Form/InputField';
import { Mail, Lock } from 'lucide-react';

type Props = {
    formData: { email: string; password: string };
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onForgot: () => void;
};

const LoginForm: React.FC<Props> = ({ formData, errors, handleChange, isLoading, onSubmit, onForgot }) => (
    <form onSubmit={onSubmit} className="space-y-5">
        <InputField
            id="login-email"
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
            id="login-password"
            name="password"
            label="Mật khẩu"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock />}
            placeholder="••••••••"
            required
            autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm -mt-2">
            {/* <label className="flex items-center text-gray-400">
                <input type="checkbox" className="rounded border-gray-500 text-blue-500 focus:ring-blue-500 bg-gray-700" />
                <span className="ml-2">Ghi nhớ tôi</span>
            </label> */}
            <div /> {/* Spacer */}
            <button 
                type="button" 
                onClick={onForgot} 
                className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none focus:underline"
            >
                Quên mật khẩu?
            </button>
        </div>

        <Button
            type="submit"
            size="lg"
            className="w-full !py-2.5"
            isLoading={isLoading}
            disabled={isLoading}
        >
            Đăng nhập
        </Button>
    </form>
);

export default LoginForm;
