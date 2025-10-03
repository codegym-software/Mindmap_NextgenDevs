import React from 'react';
import { createPortal } from 'react-dom';

const DropdownPortal = ({ mindmap, isOpen, position, onClose, isDarkMode, onShare, onRename, onSave, onDelete }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={onClose} style={{ pointerEvents: 'auto' }}>
            <div
                className={`absolute w-32 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border rounded-lg shadow-2xl`}
                style={{ left: position.x, top: position.y, pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="py-1">
                    <button
                        onClick={() => onShare(mindmap)}
                        className={`w-full px-3 py-1.5 text-left text-xs ${isDarkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-1.5`}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Chia sẻ
                    </button>
                    <button
                        onClick={() => onRename(mindmap)}
                        className={`w-full px-3 py-1.5 text-left text-xs ${isDarkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-1.5`}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Đổi tên
                    </button>
                    <button
                        onClick={() => onSave(mindmap)}
                        className={`w-full px-3 py-1.5 text-left text-xs ${isDarkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-1.5`}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Lưu trữ
                    </button>
                    <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} my-1`} />
                    <button
                        onClick={() => onDelete(mindmap.id)}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center gap-1.5"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Xóa
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DropdownPortal;