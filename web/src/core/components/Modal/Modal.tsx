/**
 * Component Modal dùng chung, tái cấu trúc từ code cũ.
 * Hỗ trợ User Story #3 (Xác nhận xóa).
 * Sử dụng Tailwind cho styling và transitions.
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../Button/Button'; // Import Button mới

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode; // Tùy chọn cho các nút custom
    size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}) => {
    // Xử lý đóng modal bằng phím Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Kích thước modal
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    }[size];

    // Sử dụng CSS transitions cho hiệu ứng "đẹp"
    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out
                ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        >
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300
                    ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Modal Content */}
            <div
                className={
                    `relative w-full bg-gray-800 rounded-xl shadow-2xl border border-gray-700/50
                    transition-all duration-300 ease-in-out
                    ${sizeClasses}
                    ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`
                }
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 id="modal-title" className="text-lg font-semibold text-white">
                        {title}
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white"
                        onClick={onClose}
                        aria-label="Đóng modal"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-4 text-gray-300 text-sm">
                    {children}
                </div>

                {/* Footer (nếu có) */}
                {footer && (
                    <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
