import React from 'react';

const RenameModal = ({ isDarkMode, showRenameModal, newName, setNewName, onConfirm, onCancel }) => {
    if (!showRenameModal) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
            <div
                className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl border ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Đổi tên mindmap
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Nhập tên mới cho mindmap
                        </p>
                    </div>
                </div>
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                    } focus:border-blue-500 outline-none mb-6`}
                    placeholder="Nhập tên mới..."
                    autoFocus
                />
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
                        disabled={!newName.trim()}
                        className="flex-1 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium"
                    >
                        Đổi tên
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;