import React from 'react';

const EditorToolbar = ({ isDarkMode, mindmap, onRename, onSave, onShare, onClose }) => {
    if (!mindmap) return null;
    return (
        <div
            className={`fixed top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md border ${
                isDarkMode ? 'bg-gray-800/80 border-gray-700 text-gray-200' : 'bg-white/85 border-gray-200 text-gray-700'
            }`}
        >
            <button
                onClick={onClose}
                className={`px-2 py-1 rounded-lg text-sm font-medium flex items-center gap-1 ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } transition-colors`}
                title="Thoát khỏi chế độ chỉnh sửa"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Thoát
            </button>
            <div className="h-5 w-px bg-gray-500/40" />
            <span className="font-semibold max-w-[240px] truncate">{mindmap.name}</span>
            <div className="flex items-center gap-2 pl-1">
                <button
                    onClick={onRename}
                    className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${
                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Đổi tên
                </button>
                <button
                    onClick={onSave}
                    className="px-2 py-1 rounded-lg text-xs flex items-center gap-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                    title="Ctrl+S"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Lưu
                </button>
                <button
                    onClick={onShare}
                    className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${
                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Chia sẻ
                </button>
            </div>
        </div>
    );
};

export default EditorToolbar;