import React from 'react';
import { Download} from 'lucide-react';
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
      color: 'text-red-600'
    },
    {
      id: 'text',
      label: 'Text (.txt)',
      color: 'text-blue-600'
    },
    {
      id: 'png',
      label: 'PNG (.png)',
      color: 'text-green-600'
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xuất Mindmap">
      <div className="space-y-4">
        {exportOptions.map((option) => {
          return (
            <button
              key={option.id}
              onClick={() => {
                onExport(option.id as 'text' | 'png' | 'pdf');
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">{option.label}</p>
              </div>
              <Download className="w-5 h-5 text-gray-400 ml-auto" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
