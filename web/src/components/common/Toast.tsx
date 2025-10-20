// src/components/common/Toast.tsx
import React from 'react';

type ToastMessage = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

const toastStyles = {
  success: "bg-green-600/90 border-green-500",
  error: "bg-red-600/90 border-red-500",
  info: "bg-blue-600/90 border-blue-500",
};

const Toast: React.FC<ToastMessage> = ({ message, type }) => (
  <div
    className={`px-4 py-3 rounded-md text-white font-medium shadow-lg border-l-4 ${toastStyles[type]}`}
  >
    {message}
  </div>
);

const ToastContainer: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => (
  <div className="fixed top-5 right-5 z-[100] space-y-2">
    {toasts.map((toast) => (
      <Toast key={toast.id} {...toast} />
    ))}
  </div>
);

export default ToastContainer;