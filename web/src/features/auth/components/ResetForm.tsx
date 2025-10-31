// src/features/auth/components/ResetForm.tsx
/**
 * Form Đặt lại mật khẩu.
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import Button from '../../../core/components/Button/Button';
import InputField from '../../../core/components/Form/InputField';
import { Hash, Lock } from 'lucide-react';

type Props = {
    resetCode: string;
    newPassword: string;
    errors: Record<string, string>;
    isLoading: boolean;
    onChangeCode: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onChangePassword: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
};

const ResetForm: React.FC<Props> = ({
    resetCode, newPassword, errors, isLoading, 
    onChangeCode, onChangePassword, onSubmit 
}) => (
    <form onSubmit={onSubmit} className="space-y-5">
         <p className="text-center text-gray-400 text-sm -mt-2">
            Kiểm tra email của bạn để lấy mã và nhập mật khẩu mới.
        </p>

        <InputField
            id="reset-code"
            name="resetCode"
            label="Mã khôi phục"
            type="text"
            value={resetCode}
            onChange={onChangeCode}
            error={errors.resetCode || errors.general}
            icon={<Hash />}
            placeholder="123456"
            required
            autoComplete="one-time-code"
            className="text-center tracking-[0.3em]"
        />

        <InputField
            id="reset-newPassword"
            name="newPassword"
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={onChangePassword}
            error={errors.newPassword}
            icon={<Lock />}
            placeholder="Tối thiểu 8 ký tự"
            required
            autoComplete="new-password"
        />

        <Button
            type="submit"
            size="lg"
            className="w-full !py-2.5"
            isLoading={isLoading}
            disabled={isLoading}
        >
            Đặt lại mật khẩu
        </Button>
    </form>
);

export default ResetForm;
