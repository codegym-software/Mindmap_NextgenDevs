// src/features/auth/components/MessageDisplay.tsx
/**
 * Hiển thị thông báo Lỗi hoặc Thông tin trong AuthModal.
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
    infoMessage?: string;
    errorMessage?: string;
}

const MessageDisplay: React.FC<Props> = ({ infoMessage, errorMessage }) => {
    if (!infoMessage && !errorMessage) return null;

    if (infoMessage) {
        return (
            <div className="text-green-300 text-sm mb-4 text-center p-2.5 bg-green-500/10 rounded-md border border-green-500/30 flex items-center gap-2">
                <CheckCircle size={16} className="flex-shrink-0" />
                <span>{infoMessage}</span>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="text-red-300 text-sm mb-4 text-center p-2.5 bg-red-500/10 rounded-md border border-red-500/30 flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
            </div>
        );
    }
    
    return null;
};

export default MessageDisplay;
