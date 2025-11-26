import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentUrl?: string;
  onConfirm: (url: string | undefined) => void;
};

export default function HyperlinkModal({ isOpen, onClose, currentUrl, onConfirm }: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (isOpen) setUrl(currentUrl || '');
  }, [isOpen, currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Nếu url rỗng thì coi như là xóa link
    onConfirm(url.trim() === '' ? undefined : url.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chèn liên kết">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn (URL)</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">Để trống để xóa liên kết hiện tại.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Hủy</Button>
          <Button type="submit" size="sm">Xác nhận</Button>
        </div>
      </form>
    </Modal>
  );
}