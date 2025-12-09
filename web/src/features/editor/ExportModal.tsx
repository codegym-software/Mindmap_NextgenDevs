import React from 'react';
import { Download, FileText, Image } from 'lucide-react';
import Modal from '../../components/common/Modal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'text' | 'png' | 'pdf') => void;
}

export default function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const exportOptions = [
    {
      id: 'pdf',
      label: 'PDF (.pdf)',
      description: 'Xuất dưới dạng PDF',
      icon: Image,
      color: 'text-red-600'
    },
    {
      id: 'text',
      label: 'Text (.txt)',
      description: 'Xuất dưới dạng văn bản',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      id: 'png',
      label: 'Image PNG (.png)',
      description: 'Xuất dưới dạng hình ảnh',
      icon: Image,
      color: 'text-green-600'
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xuất Mindmap">
      <div className="space-y-4">
        {exportOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => {
                onExport(option.id as 'text' | 'png' | 'pdf');
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <IconComponent className={`w-6 h-6 ${option.color}`} />
              <div className="text-left">
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
              <Download className="w-5 h-5 text-gray-400 ml-auto" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
