import React from 'react';

const CreateModal = ({ isDarkMode, showCreateModal, newMindmapName, setNewMindmapName, onCreate, onCancel }) => {
    if (!showCreateModal) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl`}>
                <h3 className="text-xl font-bold text-white mb-4">Tạo Mindmap Mới</h3>
                <input
                    type="text"
                    placeholder="Nhập tên mindmap..."
                    value={newMindmapName}
                    onChange={(e) => setNewMindmapName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-white/10 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'
                    } focus:border-indigo-500 outline-none`}
                    autoFocus
                />
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-3 px-4 rounded-lg ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onCreate}
                        className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium"
                    >
                        Tạo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateModal;