import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import MindmapEditorWrapper from './MindmapEditor';

const EditorToolbar = ({
                         isDarkMode,
                         mindmap,
                         onRename,
                         onSave,
                         onShare,
                         onClose
                       }) => {
  if (!mindmap) return null;
  return (
      <div
          className={`fixed top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md border ${
              isDarkMode
                  ? 'bg-gray-800/80 border-gray-700 text-gray-200'
                  : 'bg-white/85 border-gray-200 text-gray-700'
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

const Dashboard = ({ user, onLogout }) => {
  const [mindmaps, setMindmaps] = useState([]);
  const [currentMindmap, setCurrentMindmap] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMindmapName, setNewMindmapName] = useState('');
  const [showNotification, setShowNotification] = useState({ show: false, message: '', type: 'success' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState({ show: false, mindmap: null });
  const [showRenameModal, setShowRenameModal] = useState({ show: false, mindmap: null, newName: '' });
  const [showMindmapEditor, setShowMindmapEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  const API_BASE = 'http://localhost:8081/api/mindmaps';

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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch mindmaps');
      }
      const data = await response.json();
      const formattedData = data.map(mindmap => ({
        ...mindmap,
        updated: mindmap.updatedAt
            ? new Date(mindmap.updatedAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        color: mindmap.color || 'from-indigo-500 to-purple-600',
      }));
      setMindmaps(formattedData);
    } catch (error) {
      console.error('Error fetching mindmaps:', error);
      showNotificationMessage(error.message || 'Lỗi khi tải mindmap!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMindmaps(); }, []);

  const filteredMindmaps = mindmaps.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMindmapName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create mindmap');
      }
      const createdData = await response.json();
      const newMindmap = {
        id: createdData.id,
        name: createdData.name,
        updated: new Date().toISOString().split('T')[0],
        color: 'from-indigo-500 to-purple-600',
        rootNodeId: createdData.rootNodeId,
      };
      setMindmaps(prev => [newMindmap, ...prev]);
      setCurrentMindmap(newMindmap);
      setShowMindmapEditor(true);
      setShowCreateModal(false);
      setNewMindmapName('');
      showNotificationMessage('Mindmap đã được tạo thành công!', 'success');
    } catch (error) {
      console.error('Error creating mindmap:', error);
      showNotificationMessage(error.message || 'Lỗi khi tạo mindmap!', 'error');
    }
  };

  const openMindmap = (mindmap) => {
    setCurrentMindmap(mindmap);
    setShowMindmapEditor(true);
  };

  const closeMindmapEditor = () => {
    setShowMindmapEditor(false);
    setCurrentMindmap(null);
  };

  const renameMindmap = () => {
    if (!currentMindmap) return;
    setShowRenameModal({ show: true, mindmap: currentMindmap, newName: currentMindmap.name });
  };

  const renameMindmapFromDropdown = (mindmap) => {
    setShowRenameModal({ show: true, mindmap, newName: mindmap.name });
    setActiveDropdown(null);
  };

  const confirmRename = async () => {
    if (showRenameModal.mindmap && showRenameModal.newName.trim()) {
      const token = localStorage.getItem('cognito_token');
      if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/${showRenameModal.mindmap.id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: showRenameModal.newName.trim() }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to rename mindmap');
        }
        const updatedData = await response.json();
        setMindmaps(prev => prev.map(m =>
            m.id === showRenameModal.mindmap.id
                ? {
                  ...m,
                  name: updatedData.name,
                  updated: updatedData.updatedAt
                      ? new Date(updatedData.updatedAt).toISOString().split('T')[0]
                      : new Date().toISOString().split('T')[0],
                }
                : m
        ));
        if (currentMindmap && currentMindmap.id === showRenameModal.mindmap.id) {
          setCurrentMindmap(prev => ({ ...prev, name: showRenameModal.newName.trim() }));
        }
        showNotificationMessage('Đã đổi tên thành công!', 'success');
      } catch (error) {
        console.error('Error renaming mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi đổi tên!', 'error');
      }
    }
    setShowRenameModal({ show: false, mindmap: null, newName: '' });
  };

  const saveMindmap = async () => {
    if (!currentMindmap) return;
    const token = localStorage.getItem('cognito_token');
    if (!token) {
      showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/${currentMindmap.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentMindmap.name }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save mindmap');
      }
      const updatedData = await response.json();
      setMindmaps(prev => prev.map(m =>
          m.id === currentMindmap.id
              ? {
                ...m,
                updated: updatedData.updatedAt
                    ? new Date(updatedData.updatedAt).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
              }
              : m
      ));
      showNotificationMessage('Đã lưu thành công!', 'success');
    } catch (error) {
      console.error('Error saving mindmap:', error);
      showNotificationMessage(error.message || 'Lỗi khi lưu mindmap!', 'error');
    }
  };

  const saveMindmapFromDropdown = async (mindmap) => {
    const token = localStorage.getItem('cognito_token');
    if (!token) {
      showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/${mindmap.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mindmap.name }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save mindmap');
      }
      const updatedData = await response.json();
      setMindmaps(prev => prev.map(m =>
          m.id === mindmap.id
              ? {
                ...m,
                updated: updatedData.updatedAt
                    ? new Date(updatedData.updatedAt).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
              }
              : m
      ));
      showNotificationMessage('Đã lưu thành công!', 'success');
    } catch (error) {
      console.error('Error saving mindmap:', error);
      showNotificationMessage(error.message || 'Lỗi khi lưu mindmap!', 'error');
    }
    setActiveDropdown(null);
  };

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
      showNotificationMessage('Link đã được sao chép!', 'info');
    }
  };

  const shareMindmapFromDropdown = (mindmap) => {
    if (navigator.share) {
      navigator.share({
        title: mindmap.name,
        text: `Chia sẻ mindmap: ${mindmap.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotificationMessage('Link đã được sao chép!', 'info');
    }
    setActiveDropdown(null);
  };

  const deleteMindmap = async (id) => {
    const mindmap = mindmaps.find(m => m.id === id);
    setShowDeleteModal({ show: true, mindmap });
  };

  const confirmDelete = async () => {
    if (showDeleteModal.mindmap) {
      const token = localStorage.getItem('cognito_token');
      if (!token) {
        showNotificationMessage('Không tìm thấy token. Vui lòng đăng nhập lại!', 'error');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/${showDeleteModal.mindmap.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to delete mindmap');
        }
        await response.json();
        setMindmaps(prev => prev.filter(m => m.id !== showDeleteModal.mindmap.id));
        if (currentMindmap && currentMindmap.id === showDeleteModal.mindmap.id) setCurrentMindmap(null);
        showNotificationMessage('Mindmap đã được xóa!', 'success');
      } catch (error) {
        console.error('Error deleting mindmap:', error);
        showNotificationMessage(error.message || 'Lỗi khi xóa mindmap!', 'error');
      }
    }
    setShowDeleteModal({ show: false, mindmap: null });
  };

  const zoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
  const zoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.1));
  const resetZoom = () => setZoom(1);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const showNotificationMessage = (message, type) => {
    setShowNotification({ show: true, message, type });
    setTimeout(() => {
      setShowNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const toggleDropdown = (mindmapId, buttonRef) => {
    if (activeDropdown === mindmapId) {
      setActiveDropdown(null);
    } else {
      if (buttonRef && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({ x: rect.right - 128, y: rect.bottom + 4 });
      }
      setActiveDropdown(mindmapId);
    }
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.dropdown-container')) {
      setActiveDropdown(null);
    }
  };

  const DropdownPortal = ({ mindmap, isOpen, position, onClose }) => {
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
                  onClick={(e) => { e.stopPropagation(); shareMindmapFromDropdown(mindmap); }}
                  className={`w-full px-3 py-1.5 text-left text-xs ${isDarkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-1.5`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Chia sẻ
              </button>
              <button
                  onClick={(e) => { e.stopPropagation(); renameMindmapFromDropdown(mindmap); }}
                  className={`w-full px-3 py-1.5 text-left text-xs ${isDarkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-1.5`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Đổi tên
              </button>
              <button
                  onClick={(e) => { e.stopPropagation(); saveMindmapFromDropdown(mindmap); }}
                  className={`w-full px-3 py-1.5 text-left text-xs ${isDarkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-1.5`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Lưu trữ
              </button>
              <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} my-1`} />
              <button
                  onClick={(e) => { e.stopPropagation(); deleteMindmap(mindmap.id); onClose(); }}
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

  const logout = () => {
    showNotificationMessage('Đã đăng xuất thành công!', 'success');
    setTimeout(() => {
      localStorage.removeItem('cognito_token');
      if (onLogout) onLogout();
    }, 1000);
  };

  // Phím tắt Ctrl+S để lưu
  const handleKeydown = useCallback((e) => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (showMindmapEditor && currentMindmap) {
        saveMindmap();
      }
    }
    if (e.key === 'Escape' && showMindmapEditor) {
      closeMindmapEditor();
    }
  }, [showMindmapEditor, currentMindmap]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  return (
      <div
          className={`h-screen w-screen flex transition-colors duration-300 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}
          style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}
          onClick={handleClickOutside}
      >
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-12' : 'w-52'} ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'p-2' : 'p-4'} relative z-10`}>
          {/* Header nhỏ trong sidebar */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} mb-4`}>
            <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 grid place-items-center shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 cursor-pointer group relative"
                title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            >
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50 pointer-events-none">
                {sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
              </div>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
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
              className={`mt-3 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'} ${
                  sidebarCollapsed ? 'py-2 px-2' : 'py-2 px-3'
              } rounded-lg border flex items-center justify-center gap-2 text-sm`}
              title={sidebarCollapsed ? "Đăng xuất" : ""}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && "Đăng xuất"}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative">

          {/* Nút toggle dark/light giữ nguyên */}
          <button
              onClick={toggleTheme}
              className={`fixed top-6 right-6 z-50 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              } shadow-lg`}
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

          {/* Header CHỈ hiển thị khi chưa vào editor */}
          {!(showMindmapEditor && currentMindmap) && (
              <header className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} transition-colors duration-300`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
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
                              className={`px-3 py-1.5 rounded-lg ${
                                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                              } text-sm font-medium flex items-center gap-2`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Đổi tên
                          </button>
                          <button
                              onClick={saveMindmap}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-green-600/25"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Lưu
                          </button>
                          <button
                              onClick={shareMindmap}
                              className={`px-3 py-1.5 rounded-lg ${
                                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                              } text-sm font-medium flex items-center gap-2`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                            Chia sẻ
                          </button>
                        </>
                    )}
                  </div>
                </div>
              </header>
          )}

          {/* Toolbar thay thế khi header bị ẩn */}
          {showMindmapEditor && currentMindmap && (
              <EditorToolbar
                  isDarkMode={isDarkMode}
                  mindmap={currentMindmap}
                  onRename={renameMindmap}
                  onSave={saveMindmap}
                  onShare={shareMindmap}
                  onClose={closeMindmapEditor}
              />
          )}

          <section className="relative flex-1 flex items-center justify-center select-none overflow-hidden">
            {showMindmapEditor && currentMindmap ? (
                <MindmapEditorWrapper
                    mindmapId={currentMindmap.id}
                    onClose={closeMindmapEditor}
                    isLoggedIn={true}
                />
            ) : (
                <>
                  <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                      }}
                  ></div>
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl`}>
                <h3 className="text-xl font-bold text-white mb-4">Tạo Mindmap Mới</h3>
                <input
                    type="text"
                    placeholder="Nhập tên mindmap..."
                    value={newMindmapName}
                    onChange={(e) => setNewMindmapName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-white/10 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'} focus:border-indigo-500 outline-none`}
                    autoFocus
                />
                <div className="flex gap-3 mt-6">
                  <button
                      onClick={() => { setShowCreateModal(false); setNewMindmapName(""); }}
                      className={`flex-1 py-3 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    Hủy
                  </button>
                  <button
                      onClick={createMindmap}
                      className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium"
                  >
                    Tạo
                  </button>
                </div>
              </div>
            </div>
        )}

        {showNotification.show && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 ${
                showNotification.type === 'success' ? 'bg-green-600' :
                    showNotification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white font-medium`}>
              {showNotification.message}
            </div>
        )}

        {activeDropdown && (
            <DropdownPortal
                mindmap={mindmaps.find(m => m.id === activeDropdown)}
                isOpen={!!activeDropdown}
                position={dropdownPosition}
                onClose={() => setActiveDropdown(null)}
            />
        )}

        {showDeleteModal.show && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                  Bạn có chắc chắn muốn xóa mindmap <span className="font-semibold">"{showDeleteModal.mindmap?.name}"</span>?
                </p>
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowDeleteModal({ show: false, mindmap: null })}
                      className={`flex-1 py-3 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-medium`}
                  >
                    Hủy
                  </button>
                  <button
                      onClick={confirmDelete}
                      className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
        )}

        {showRenameModal.show && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-96 shadow-2xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
                    value={showRenameModal.newName}
                    onChange={(e) => setShowRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'} focus:border-blue-500 outline-none mb-6`}
                    placeholder="Nhập tên mới..."
                    autoFocus
                />
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowRenameModal({ show: false, mindmap: null, newName: '' })}
                      className={`flex-1 py-3 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-medium`}
                  >
                    Hủy
                  </button>
                  <button
                      onClick={confirmRename}
                      disabled={!showRenameModal.newName.trim()}
                      className="flex-1 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium"
                  >
                    Đổi tên
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default Dashboard;