import React from 'react';
import { X, Check, User } from 'lucide-react';
import Modal from '../../components/common/Modal'; // Tận dụng Modal có sẵn của bạn
import { RequestUser } from '../../hooks/useMindmapAccess';

interface AccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RequestUser[];
  onApprove: (uid: string) => void;
  onDeny: (uid: string) => void;
}

const AccessRequestModal: React.FC<AccessRequestModalProps> = ({
  isOpen,
  onClose,
  requests,
  onApprove,
  onDeny
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yêu cầu truy cập">
      <div className="p-4">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Không có yêu cầu nào đang chờ.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.uid} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{req.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => onDeny(req.uid)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                    title="Từ chối"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onApprove(req.uid)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition"
                  >
                    <Check className="w-3 h-3" /> Duyệt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AccessRequestModal;