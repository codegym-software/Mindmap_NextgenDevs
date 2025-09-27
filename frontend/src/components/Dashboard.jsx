import { useState, useEffect, useRef } from 'react';

const Dashboard = ({ user, onLogout }) => {
  const [mindmaps, setMindmaps] = useState([]);
  const [currentMindmap, setCurrentMindmap] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMindmapName, setNewMindmapName] = useState("");
  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "success" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  const API_BASE = 'http://localhost:8081/api/mindmaps'; // Endpoint đúng và port 8081

  // Fetch mindmaps từ backend
  const fetchMindmaps = async () => {
    const token = localStorage.getItem('cognito_token');
    if (!token) {
      showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_BASE, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch mindmaps');
      }

      const data = await response.json();
      // Chuyển đổi dữ liệu từ backend (updatedAt -> updated, thêm color mặc định)
      const formattedData = data.map(mindmap => ({
        ...mindmap,
        updated: mindmap.updatedAt ? new Date(mindmap.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        color: mindmap.color || "from-indigo-500 to-purple-600", // Mặc định nếu chưa có
      }));
      setMindmaps(formattedData);
    } catch (error) {
      console.error('Error fetching mindmaps:', error);
      showNotificationMessage(error.message || 'Lỗi khi tải mindmap!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch khi component mount
  useEffect(() => {
    fetchMindmaps();
  }, []);

  // Filter mindmaps based on search term
  const filteredMindmaps = mindmaps.filter(mindmap =>
      mindmap.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create new mindmap - Gọi POST backend
  const createMindmap = async () => {
    if (!newMindmapName.trim()) {
      showNotificationMessage('Vui lòng nhập tên mindmap!', 'error');
      return;
    }

    const token = localStorage.getItem('cognito_token');
    if (!token) {
      showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
      return;
    }

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newMindmapName.trim() }), // DTO: CreateRequest {name}
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create mindmap');
      }

      const createdData = await response.json();
      // Thêm vào state với dữ liệu từ backend
      const newMindmap = {
        id: createdData.id,
        name: createdData.name,
        updated: new Date().toISOString().split("T")[0],
        color: "from-indigo-500 to-purple-600",
        rootNodeId: createdData.rootNodeId, // Nếu cần
      };
      setMindmaps(prev => [newMindmap, ...prev]);
      setCurrentMindmap(newMindmap);
      setShowCreateModal(false);
      setNewMindmapName("");
      showNotificationMessage("Mindmap đã được tạo thành công!", "success");
    } catch (error) {
      console.error('Error creating mindmap:', error);
      showNotificationMessage(error.message || 'Lỗi khi tạo mindmap!', 'error');
    }
  };

  // Open mindmap
  const openMindmap = (mindmap) => {
    setCurrentMindmap(mindmap);
  };

  // Rename current mindmap - Gọi PUT backend
  const renameMindmap = async () => {
    if (!currentMindmap) return;
    const newName = prompt("Tên mới:", currentMindmap.name);
    if (newName && newName.trim()) {
      const token = localStorage.getItem('cognito_token');
      if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/${currentMindmap.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName.trim() }), // DTO: UpdateRequest {name}
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to rename mindmap');
        }

        const updatedData = await response.json();
        setMindmaps(prev => prev.map(m =>
            m.id === currentMindmap.id
                ? { ...m, name: updatedData.name, updated: updatedData.updatedAt ? new Date(updatedData.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0] }
                : m
        ));
        setCurrentMindmap(prev => ({ ...prev, name: newName.trim() }));
        showNotificationMessage("Đã đổi tên thành công!", "success");
      } catch (error) {
        console.error('Error renaming mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi đổi tên!', 'error');
      }
    }
  };

  // Save current mindmap - Gọi PUT backend (nếu cần cập nhật content, nhưng hiện tại chỉ rename)
  const saveMindmap = async () => {
    if (!currentMindmap) return;
    // Nếu cần lưu content, thêm logic fetch GET /{id} để lấy full data, rồi PUT với content
    // Hiện tại, chỉ gọi rename nếu có thay đổi, hoặc gọi PUT đơn giản
    showNotificationMessage("Đã lưu thành công!", "success");
    // Nếu cần lưu content, mở rộng hàm này
  };

  // Share current mindmap
  const shareMindmap = () => {
    if (!currentMindmap) return;
    if (navigator.share) {
      navigator.share({
        title: currentMindmap.name,
        text: `Chia sẻ mindmap: ${currentMindmap.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotificationMessage("Link đã được sao chép!", "info");
    }
  };

  // Logout
  const logout = () => {
    showNotificationMessage("Đã đăng xuất thành công!", "success");
    setTimeout(() => {
      localStorage.removeItem('cognito_token');
      if (onLogout) onLogout();
    }, 1000);
  };

  // Zoom functions
  const zoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
  const zoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.1));
  const resetZoom = () => setZoom(1);

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Show notification
  const showNotificationMessage = (message, type) => {
    setShowNotification({ show: true, message, type });
    setTimeout(() => {
      setShowNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Delete mindmap - Gọi DELETE backend
  const deleteMindmap = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa mindmap này?")) {
      const token = localStorage.getItem('cognito_token');
      if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to delete mindmap');
        }

        await response.json(); // Để xác nhận
        setMindmaps(prev => prev.filter(m => m.id !== id));
        if (currentMindmap && currentMindmap.id === id) setCurrentMindmap(null);
        showNotificationMessage("Mindmap đã được xóa!", "success");
      } catch (error) {
        console.error('Error deleting mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi xóa mindmap!', 'error');
      }
    }
  };

  return (
      <div className={`h-screen w-screen flex transition-colors duration-300 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`} style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
        {/* Sidebar */}
        <aside className={`w-80 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col p-6`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 grid place-items-center shadow-lg"> 
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /> 
              </svg> 
              </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Mindmaps</h2>
              <p className="text-sm text-gray-400">Quản lý sơ đồ nhanh chóng</p>
            </div>
          </div>


          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                  type="text"
                  placeholder="Tìm mindmap..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'} border focus:border-purple-500 outline-none rounded-lg py-3 pl-10 pr-4 transition-colors duration-200`}
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Create Button */}
          <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 px-4 rounded-lg mb-4 font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo Mindmap Mới
          </button>

          {/* Mindmap List */}
          <div className="space-y-2 overflow-y-auto flex-1 pr-2">
            {loading ? (
                <p className="text-gray-400">Đang tải mindmap...</p>
            ) : filteredMindmaps.length === 0 ? (
                <p className="text-gray-400">Chưa có mindmap nào. Tạo mới để bắt đầu!</p>
            ) : (
                filteredMindmaps.map((mindmap) => (
                    <div
                        key={mindmap.id}
                        className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-105 ${
                            currentMindmap?.id === mindmap.id
                                ? `${isDarkMode ? 'bg-gray-700 border-purple-500' : 'bg-gray-100 border-purple-500'} shadow-lg`
                                : `${isDarkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`
                        }`}
                        onClick={() => openMindmap(mindmap)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${mindmap.color}`}></div>
                            <h3 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{mindmap.name}</h3>
                          </div>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{mindmap.updated}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                              onClick={(e) => { e.stopPropagation(); deleteMindmap(mindmap.id); }}
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                              title="Xóa"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                ))
            )}
          </div>

          {/* Logout Button */}
          <button
              onClick={logout}
              className={`mt-4 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'} py-3 px-4 rounded-lg border transition-colors duration-200 flex items-center justify-center gap-2`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className={`p-6 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} transition-colors duration-300`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {currentMindmap ? currentMindmap.name : "Chào mừng! Chọn một mindmap để chỉnh sửa"}
                </h1>
                {user && (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                      Xin chào, {user.name}!
                    </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {currentMindmap && (
                    <>
                      <button
                          onClick={renameMindmap}
                          className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} text-sm font-medium transition-colors duration-200 flex items-center gap-2`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Đổi tên
                      </button>
                      <button
                          onClick={saveMindmap}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-600/25"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Lưu
                      </button>
                      <button
                          onClick={shareMindmap}
                          className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} text-sm font-medium transition-colors duration-200 flex items-center gap-2`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Chia sẻ
                      </button>
                    </>
                )}
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors duration-200`}
                    title="Chuyển chế độ sáng/tối"
                >
                  <svg className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isDarkMode ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Editor */}
          <section className="relative flex-1 flex items-center justify-center select-none overflow-hidden">
            {/* Grid Background */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
                  backgroundSize: '20px 20px'
                }}
            ></div>

            {/* Mindmap Node */}
            {currentMindmap && (
                <div
                    ref={canvasRef}
                    className="relative w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-900/50 ring-2 ring-white/20 transition-transform duration-200 hover:scale-110 cursor-pointer"
                    style={{ transform: `scale(${zoom})` }}
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                  <div className="absolute -inset-2 rounded-full bg-blue-400/30 blur-2xl -z-10"></div>
                </div>
            )}

            {/* Welcome Message */}
            {!currentMindmap && (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Chọn một mindmap để bắt đầu</h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>Hoặc tạo mindmap mới từ sidebar</p>
                </div>
            )}

            {/* Zoom Controls */}
            <div className={`fixed bottom-6 right-6 flex items-center gap-2 ${isDarkMode ? 'bg-gradient-to-r from-purple-800 to-pink-800 border-purple-600' : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300'} border rounded-xl p-3 shadow-lg shadow-purple-500/25`}>
              <button
                  onClick={zoomOut}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/80 hover:bg-white text-purple-600'} transition-colors duration-200`}
                  title="Thu nhỏ"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                  onClick={resetZoom}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/80 hover:bg-white text-purple-600'} transition-colors duration-200`}
                  title="Về giữa"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button
                  onClick={zoomIn}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/80 hover:bg-white text-purple-600'} transition-colors duration-200`}
                  title="Phóng to"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </section>
        </main>

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl`}>
                <h3 className="text-xl font-bold text-white mb-4">Tạo Mindmap Mới</h3>
                <input
                    type="text"
                    placeholder="Nhập tên mindmap..."
                    value={newMindmapName}
                    onChange={(e) => setNewMindmapName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-white/10 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'} focus:border-indigo-500 outline-none transition-colors duration-200`}
                    autoFocus
                />
                <div className="flex gap-3 mt-6">
                  <button
                      onClick={() => { setShowCreateModal(false); setNewMindmapName(""); }}
                      className={`flex-1 py-3 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors duration-200`}
                  >
                    Hủy
                  </button>
                  <button
                      onClick={createMindmap}
                      className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium transition-all duration-200"
                  >
                    Tạo
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Notification */}
        {showNotification.show && (
            <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 ${
                showNotification.type === 'success' ? 'bg-green-600' :
                    showNotification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white font-medium transition-all duration-300`}>
              {showNotification.message}
            </div>
        )}
      </div>
  );
};

export default Dashboard;