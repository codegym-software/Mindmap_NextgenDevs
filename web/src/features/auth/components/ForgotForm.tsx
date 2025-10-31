// src/features/auth/components/ForgotForm.tsx
/**
 * Form Quên mật khẩu (User Story #25).
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import Button from '../../../core/components/Button/Button';
import InputField from '../../../core/components/Form/InputField';
import { Mail } from 'lucide-react';

type Props = {
    formData: { email: string };
    errors: Record<string, string>;
    isLoading: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
};

const ForgotForm: React.FC<Props> = ({ formData, errors, isLoading, onChange, onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-5">
        <p className="text-center text-gray-400 text-sm -mt-2">
            Nhập email của bạn. Chúng tôi sẽ gửi một mã để khôi phục mật khẩu.
        </p>

        <InputField
            id="forgot-email"
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={onChange}
            error={errors.email || errors.general}
            icon={<Mail />}
            placeholder="ban@email.com"
            required
            autoComplete="email"
        />

        <Button
            type="submit"
            size="lg"
            className="w-full !py-2.5"
            isLoading={isLoading}
            disabled={isLoading}
        >
            Gửi mã khôi phục
        </Button>
    </form>
);

export default ForgotForm;
