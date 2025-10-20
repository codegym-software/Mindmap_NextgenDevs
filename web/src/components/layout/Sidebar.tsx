// src/components/layout/Sidebar.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useMindmapsStore } from "../../app/store/useMindmapsStore";
import { mindmapsApi } from "../../services/mindmapsApi";
import { Plus, Search, LogOut, Edit, Trash2, Share2, MoreVertical, Pin, PinOff } from 'lucide-react';
import { useToast } from "../../hooks/useToast";

const PIN_KEY = "mm_sidebar_pinned";

export default function Sidebar() {
  const { isAuthenticated, logout, user } = useAuth();
  const { addToast } = useToast();
  const isAuthed = isAuthenticated();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) === "1");
  const { items } = useMindmapsStore();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
    if (pinned) setOpen(true);
  }, [pinned]);

  useEffect(() => {
    if (pinned) return;
    const handleMouseLeave = () => setOpen(false);
    const sidebar = sidebarRef.current;
    sidebar?.addEventListener("mouseleave", handleMouseLeave);
    return () => sidebar?.removeEventListener("mouseleave", handleMouseLeave);
  }, [pinned]);

  const handleCreateNew = () => {
    window.dispatchEvent(new CustomEvent("mm:create"));
  };
  
  // Handlers for mindmap item actions
  const handleRename = (id: string) => addToast(`Đổi tên: ${id}`, "info"); // Placeholder
  const handleDelete = (id: string) => addToast(`Xóa: ${id}`, "error"); // Placeholder
  const handleShare = (id: string) => {
    const url = `${window.location.origin}/editor/${id}`;
    navigator.clipboard.writeText(url);
    addToast("Đã sao chép link!", "success");
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => !pinned && setOpen(true)}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-gray-800/50 hover:bg-gray-700/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
        aria-label="Toggle sidebar"
      >
        <MoreVertical />
      </button>

      <aside
        ref={sidebarRef}
        onMouseEnter={() => !pinned && setOpen(true)}
        className={`fixed top-0 left-0 h-screen bg-gray-900/95 backdrop-blur text-white z-40 transition-transform duration-300 border-r border-gray-700 flex flex-col ${
          open ? "translate-x-0 w-72" : "-translate-x-full w-72"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700 flex-shrink-0" style={{ paddingLeft: '64px' }}>
          <span className="font-semibold text-lg">Mindmap</span>
          <button
            onClick={() => setPinned(!pinned)}
            className="p-2 rounded-md hover:bg-gray-700"
            title={pinned ? "Bỏ ghim" : "Ghim sidebar"}
          >
            {pinned ? <PinOff size={20} /> : <Pin size={20} />}
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 border-b border-gray-700">
          <button
            onClick={handleCreateNew}
            className="w-full py-3 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Tạo mindmap mới
          </button>
          <div className="relative">
            <input
              type="text"
              className="w-full bg-gray-800 rounded-md py-2 pl-10 pr-3 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
              placeholder="Tìm kiếm mindmap..."
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <div className="text-xs text-white/50 px-2 mb-2 font-semibold uppercase">Gần đây</div>
          {items.length === 0 ? (
            <div className="text-center text-white/40 py-8 text-sm">Chưa có mindmap nào</div>
          ) : (
            items.slice(0, 20).map((m) => (
              <div key={m.id} className="group relative w-full text-left p-3 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-between">
                <a href={`/editor/${m.id}`} className="flex-grow">
                  <div className="text-white font-medium truncate">{m.name}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {new Date(m.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </a>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <button onClick={() => handleShare(m.id)} className="p-1.5 rounded hover:bg-gray-700"><Share2 size={14}/></button>
                  <button onClick={() => handleRename(m.id)} className="p-1.5 rounded hover:bg-gray-700"><Edit size={14}/></button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-gray-700 text-red-400"><Trash2 size={14}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-700 p-4 mt-auto">
          {isAuthed ? (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">{user?.email?.[0]?.toUpperCase()}</div>
                    <span className="text-sm text-white/70 truncate max-w-[120px]">{user?.email}</span>
                </div>
              <button onClick={logout} className="p-2 rounded-md hover:bg-gray-700" title="Đăng xuất">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="text-sm text-white/60 text-center">Chưa đăng nhập</div>
          )}
        </div>
      </aside>
    </>
  );
}