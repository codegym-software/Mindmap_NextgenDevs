// src/app/providers/NotificationProvider.tsx
import React, { createContext, useState, useCallback } from "react";
import ToastContainer from "../../components/common/Toast";

type ToastMessage = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

type ToastContextType = {
  addToast: (message: string, type?: ToastMessage["type"]) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage["type"] = "info") => {
    // FIX: Add Math.random() to ensure unique key even with rapid calls
    const id = Date.now() + Math.random(); 
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
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