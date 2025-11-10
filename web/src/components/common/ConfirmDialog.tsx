// src/components/common/ConfirmDialog.tsx
import React from "react";
import Modal from "./Modal";

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "primary";
};

export default function ConfirmDialog({
  isOpen,
  title = "Xác nhận",
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
  variant = "primary",
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="text-gray-200 text-sm leading-relaxed">
        {message}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={
            variant === "danger"
              ? "px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
              : "px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
          }
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

