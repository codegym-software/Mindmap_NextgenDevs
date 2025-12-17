// src/features/editor/AccessDeniedScreen.tsx

import React from 'react';
import { Lock, Loader2, Send, ChevronLeft, XCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

export type RequestStatus = 'none' | 'pending' | 'rejected';

type Props = {
  onRequestAccess: () => void | Promise<void>;
  requestStatus: RequestStatus;
  userId?: string;
};

const AccessDeniedScreen: React.FC<Props> = ({
  onRequestAccess,
  requestStatus,
  userId,
}) => {
  const navigate = useNavigate();

  const isPending = requestStatus === 'pending';
  const isRejected = requestStatus === 'rejected';

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-100">
        <div className="bg-blue-50 p-4 rounded-full inline-flex mb-6">
          <Lock className="w-10 h-10 text-blue-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Quyền truy cập bị giới hạn
        </h2>

        <p className="text-gray-500 mb-4">
          Mindmap này đang ở chế độ riêng tư. Bạn cần gửi yêu cầu cho chủ sở hữu để được cấp quyền xem hoặc chỉnh sửa.
        </p>

        {isRejected && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 flex items-center justify-center gap-2 mb-4">
            <XCircle className="w-4 h-4" />
            <span>Yêu cầu truy cập của bạn đã bị từ chối.</span>
          </div>
        )}

        {isPending ? (
          <div className="bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg border border-yellow-200 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đã gửi yêu cầu, đang chờ duyệt...</span>
          </div>
        ) : !isRejected ? (
          <div className="space-y-4">
            <Button
              onClick={onRequestAccess}
              variant="gradient"
              className="w-full justify-center py-3"
            >
              <Send className="w-4 h-4 mr-2" />
              Gửi yêu cầu truy cập
            </Button>

            {userId && (
              <p className="text-xs text-gray-400">
                ID của bạn: {userId}
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center justify-center gap-1 mx-auto"
          >
            <ChevronLeft size={16} /> Quay về Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedScreen;
