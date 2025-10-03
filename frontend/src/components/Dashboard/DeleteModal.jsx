import React from 'react';

const DeleteModal = ({ isDarkMode, showDeleteModal, mindmap, onConfirm, onCancel }) => {
    if (!showDeleteModal || !mindmap) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
            <div
                className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl border ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Xác nhận xóa
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Hành động này không thể hoàn tác
                        </p>
                    </div>
                </div>
                <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Bạn có chắc chắn muốn xóa mindmap <span className="font-semibold">"{mindmap.name}"</span>?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-3 px-4 rounded-lg ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        } font-medium`}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                    >
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;