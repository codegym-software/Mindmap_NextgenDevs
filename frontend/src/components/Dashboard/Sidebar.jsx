import React from 'react';

const Sidebar = ({
                     isDarkMode,
                     sidebarCollapsed,
                     setSidebarCollapsed,
                     searchQuery,
                     setSearchQuery,
                     filteredMindmaps,
                     loading,
                     currentMindmap,
                     openMindmap,
                     toggleDropdown,
                     setShowCreateModal,
                     logout
                 }) => {
    return (
        <aside
            className={`${sidebarCollapsed ? 'w-12' : 'w-52'} ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
            } border-r ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
            } flex flex-col transition-all duration-300 ${
                sidebarCollapsed ? 'p-2' : 'p-4'
            } relative z-10`}
        >
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} mb-4`}>
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 grid place-items-center shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 cursor-pointer group relative"
                    title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                >
                    <div
                        className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50 pointer-events-none"
                    >
                        {sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                    </div>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                    </svg>
                </button>
                {!sidebarCollapsed && (
                    <div>
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Mindmaps</h2>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Quản lý sơ đồ</p>
                    </div>
                )}
            </div>

            {!sidebarCollapsed && (
                <div className="mb-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full px-3 py-2 pl-8 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm ${
                                isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                        />
                        <svg
                            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={() => setShowCreateModal(true)}
                className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 ${
                    sidebarCollapsed ? 'py-2 px-2' : 'py-2 px-3'
                } rounded-lg mb-3 font-medium text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 hover:scale-105 text-sm transition-all`}
                title={sidebarCollapsed ? "Tạo Mindmap Mới" : ""}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {!sidebarCollapsed && "Tạo Mới"}
            </button>

            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {loading ? (
                    <p className="text-gray-400">Đang tải mindmap...</p>
                ) : filteredMindmaps.length === 0 ? (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm">
                            {searchQuery ? `Không tìm thấy mindmap nào chứa "${searchQuery}"` : 'Chưa có mindmap nào'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-purple-500 hover:text-purple-400 text-sm"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    filteredMindmaps.map(mindmap => (
                        <div
                            key={mindmap.id}
                            className={`group ${sidebarCollapsed ? 'p-1.5' : 'p-2'} rounded-lg border cursor-pointer hover:scale-105 transition-all ${
                                currentMindmap?.id === mindmap.id
                                    ? `${isDarkMode ? 'bg-gray-700 border-purple-500' : 'bg-gray-100 border-purple-500'} shadow-lg`
                                    : `${isDarkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`
                            }`}
                            onClick={() => openMindmap(mindmap)}
                            title={sidebarCollapsed ? mindmap.name : ""}
                        >
                            {sidebarCollapsed ? (
                                <div className="flex justify-center">
                                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${mindmap.color}`}></div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${mindmap.color}`}></div>
                                            <h3 className={`font-medium truncate text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {mindmap.name}
                                            </h3>
                                        </div>
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ml-4`}>
                                            {mindmap.updated}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleDropdown(mindmap.id, { current: e.currentTarget });
                                            }}
                                            className="p-1 rounded text-gray-400 hover:text-gray-300 hover:bg-gray-500/20"
                                            title="Tùy chọn"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={logout}
                className={`mt-3 ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                } ${sidebarCollapsed ? 'py-2 px-2' : 'py-2 px-3'} rounded-lg border flex items-center justify-center gap-2 text-sm`}
                title={sidebarCollapsed ? "Đăng xuất" : ""}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                </svg>
                {!sidebarCollapsed && "Đăng xuất"}
            </button>
        </aside>
    );
};

export default Sidebar;