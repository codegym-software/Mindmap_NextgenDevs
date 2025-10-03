import React from 'react';
import MindmapEditorWrapper from '../MindmapEditor/MindmapEditorWrapper';

const MainContent = ({ isDarkMode, showMindmapEditor, currentMindmap, user, onRename, onSave, onShare, toggleTheme }) => {
    return (
        <main className="flex-1 flex flex-col relative">
            <button
                onClick={toggleTheme}
                className={`fixed top-6 right-6 z-50 p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                } shadow-lg`}
                title="Chuyển chế độ sáng/tối"
            >
                <svg className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isDarkMode ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                    )}
                </svg>
            </button>

            {!(showMindmapEditor && currentMindmap) && (
                <header
                    className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} transition-colors duration-300`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                {currentMindmap ? currentMindmap.name : 'Chào mừng bạn đến với mindmap'}
                            </h1>
                            {user && (
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                    Xin chào, {user.name}!
                                </p>
                            )}
                        </div>
                        {currentMindmap && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onRename}
                                    className={`px-3 py-1.5 rounded-lg ${
                                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                                    } text-sm font-medium flex items-center gap-2`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                    Đổi tên
                                </button>
                                <button
                                    onClick={onSave}
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-green-600/25"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                                        />
                                    </svg>
                                    Lưu
                                </button>
                                <button
                                    onClick={onShare}
                                    className={`px-3 py-1.5 rounded-lg ${
                                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                                    } text-sm font-medium flex items-center gap-2`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                                        />
                                    </svg>
                                    Chia sẻ
                                </button>
                            </div>
                        )}
                    </div>
                </header>
            )}

            <section className="relative flex-1 flex items-center justify-center select-none overflow-hidden">
                {showMindmapEditor && currentMindmap ? (
                    <MindmapEditorWrapper mindmapId={currentMindmap.id} onClose={() => {}} isLoggedIn={true} />
                ) : (
                    <>
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                backgroundImage: `radial-gradient(circle at 1px 1px, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
                                backgroundSize: '20px 20px',
                            }}
                        ></div>
                        <div className="text-center">
                            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                </svg>
                            </div>
                            <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                                Chọn một mindmap để bắt đầu
                            </h2>
                            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
                                Hoặc tạo mindmap mới từ sidebar
                            </p>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
};

export default MainContent;