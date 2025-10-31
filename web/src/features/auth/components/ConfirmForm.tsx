// src/features/auth/components/ConfirmForm.tsx
/**
 * Form xác nhận (Confirmation Code).
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import Button from '../../../core/components/Button/Button';
import InputField from '../../../core/components/Form/InputField';
import { Hash } from 'lucide-react';

type Props = {
    confirmCode: string;
    errors: Record<string, string>;
    isLoading: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onResend: () => void;
    isResending: boolean;
};

const ConfirmForm: React.FC<Props> = ({ confirmCode, errors, isLoading, onChange, onSubmit, onResend, isResending }) => (
    <form onSubmit={onSubmit} className="space-y-5">
        <InputField
            id="confirm-code"
            name="confirmCode"
            label="Mã xác nhận"
            type="text"
            value={confirmCode}
            onChange={onChange}
            error={errors.confirmCode || errors.general} // Hiển thị lỗi chung ở đây
            icon={<Hash />}
            placeholder="123456"
            required
            autoComplete="one-time-code"
            className="text-center tracking-[0.3em]"
        />

        <Button
            type="submit"
            size="lg"
            className="w-full !py-2.5"
            isLoading={isLoading}
            disabled={isLoading || isResending}
        >
            Xác nhận
        </Button>
        
        <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onResend}
            disabled={isLoading || isResending}
            isLoading={isResending}
            className="w-full !text-blue-400 hover:!text-blue-300"
        >
            Gửi lại mã
        </Button>
    </form>
);

export default ConfirmForm;
