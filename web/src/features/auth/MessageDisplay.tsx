// src/features/auth/MessageDisplay.tsx
import React from 'react';

type Props = {
    infoMessage?: string;
    errorMessage?: string;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
// (Tệp này không thay đổi, nhưng được bao gồm cho đầy đủ Giai đoạn A)
const MessageDisplay: React.FC<Props> = ({ infoMessage, errorMessage }) => {
    if (!infoMessage && !errorMessage) return null;

    if (infoMessage) {
        return (
            <p className="text-green-400 text-sm mb-4 text-center p-2 bg-green-500/10 rounded-md border border-green-500/30">
                {infoMessage}
            </p>
        );
    }

    if (errorMessage) {
        return (
            <p className="text-red-400 text-sm mb-4 text-center p-2 bg-red-500/10 rounded-md border border-red-500/30">
                {errorMessage}
            </p>
        );
    }
    
    return null;
};

export default MessageDisplay;