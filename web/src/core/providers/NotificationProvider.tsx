// src/core/providers/NotificationProvider.tsx
/**
 * Provider cho Toast Notifications.
 * Tái cấu trúc từ `app/providers/NotificationProvider.tsx` cũ.
 * Sử dụng một component `ToastContainer` (sẽ tạo trong core/components).
 */
import React, { createContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

// --- Toast Component (Internal) ---
type ToastMessage = {
    id: number;
    message: string;
    type: "success" | "error" | "info";
};

const toastConfig = {
    success: { icon: <CheckCircle className="text-green-300" />, bar: "bg-green-500" },
    error: { icon: <XCircle className="text-red-300" />, bar: "bg-red-500" },
    info: { icon: <Info className="text-blue-300" />, bar: "bg-blue-500" },
};

const Toast: React.FC<ToastMessage> = ({ message, type }) => (
    <div
        className={`relative w-full max-w-sm overflow-hidden rounded-lg bg-gray-800 shadow-lg border border-gray-700/50
            animate-toast-in
        `}
    >
        <div className="p-4 flex items-start gap-3">
            <div className="flex-shrink-0 pt-0.5">{toastConfig[type].icon}</div>
            <div className="flex-1">
                <p className="text-sm font-medium text-white">{message}</p>
            </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${toastConfig[type].bar} animate-toast-progress`}></div>
    </div>
);

const ToastContainer: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => (
    <div className="fixed top-5 right-5 z-[100] space-y-3">
        {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
        ))}
    </div>
);
// --- End Toast Component ---


type ToastContextType = {
    addToast: (message: string, type?: ToastMessage["type"]) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastMessage["type"] = "info") => {
        const id = Date.now() + Math.random();
        setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
        
        // Tự động xóa toast sau 3 giây
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    );
};
