// src/hooks/useToast.ts
import { useContext } from "react";
import { ToastContext } from "../app/providers/NotificationProvider";

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a NotificationProvider");
  }
  return context;
};