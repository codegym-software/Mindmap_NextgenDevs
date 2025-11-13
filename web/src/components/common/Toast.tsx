// src/components/common/Toast.tsx
import React from 'react';

type ToastMessage = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
const toastStyles = {
  success: "bg-green-100/90 border-green-500 text-green-800",
  error: "bg-red-100/90 border-red-500 text-red-800",
  info: "bg-blue-100/90 border-blue-500 text-blue-800",
};

const Toast: React.FC<ToastMessage> = ({ message, type }) => (
  <div
    className={`px-4 py-3 rounded-md font-medium shadow-lg border-l-4 ${toastStyles[type]}`}
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
