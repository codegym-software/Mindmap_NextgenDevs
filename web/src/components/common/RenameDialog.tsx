// src/components/common/RenameDialog.tsx
import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

type RenameDialogProps = {
  isOpen: boolean;
  title?: string;
  initialName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export default function RenameDialog({
  isOpen,
  title = "Đổi tên",
  initialName = "",
  confirmText = "Lưu",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      // focus input khi mở
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, initialName]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Tên mindmap</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
            className="w-full rounded-md bg-gray-700 text-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tên mới"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100">
            {cancelText}
          </button>
          <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

