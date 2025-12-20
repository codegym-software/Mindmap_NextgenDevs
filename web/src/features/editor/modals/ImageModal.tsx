import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { Upload, Link as LinkIcon } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentImageUrl?: string;
  onConfirm: (url: string | undefined) => void;
};

export default function ImageModal({ isOpen, onClose, currentImageUrl, onConfirm }: Props) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setUrl(currentImageUrl || '');
      // Nếu đã có ảnh, mở tab URL để dễ xóa
      if (currentImageUrl) {
        setActiveTab('url');
      }
    }
  }, [isOpen, currentImageUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Nếu url rỗng thì xóa ảnh
    onConfirm(url.trim() === '' ? undefined : url.trim());
    onClose();
    setUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // === TODO: Tích hợp API Upload Backend thực tế ở đây ===
    // Hiện tại sẽ dùng FileReader để tạo base64 URL cho demo ngay lập tức
    setIsUploading(true);
    
    // Giả lập delay upload
    await new Promise(resolve => setTimeout(resolve, 1000));

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setIsUploading(false);
      onConfirm(result); // Trả về URL (hoặc Base64)
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chèn hình ảnh">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-2 text-sm font-medium text-center ${
              activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            Upload từ thiết bị
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium text-center ${
              activeTab === 'url' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('url')}
          >
            Link ảnh (URL)
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[150px] flex flex-col justify-center">
          {activeTab === 'upload' ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Upload className="text-blue-600" size={24} />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {isUploading ? 'Đang tải lên...' : 'Nhấn để chọn hoặc kéo thả ảnh vào đây'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF tối đa 5MB</p>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn ảnh</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border"
                    placeholder="https://example.com/image.png"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Để trống để xóa ảnh hiện tại.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
                <Button type="submit" size="sm">Chèn ảnh</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}