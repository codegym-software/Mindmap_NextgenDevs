// src/components/layout/Sidebar.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useMindmapsStore } from "../../app/store/useMindmapsStore";
import { Plus, Search, Edit, Trash2, Share2, PanelLeftOpen, Pin, PinOff } from 'lucide-react';
import { useToast } from "../../hooks/useToast";
import { mindmapsApi } from "../../services/mindmapsApi";
import { useLocalMindmap } from "../../hooks/useLocalMindmap";

const PIN_KEY = "mm_sidebar_pinned";

export default function Sidebar() {
 const { isAuthed } = useAuth();
 const { addToast } = useToast();
 const { items, set: setMindmaps, loading } = useMindmapsStore();
 const { load: loadGuests, updateGuestName, removeGuest } = useLocalMindmap();

 const [open, setOpen] = useState(false);
 const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) === "1");
 const [searchQuery, setSearchQuery] = useState("");
 const sidebarRef = useRef<HTMLDivElement>(null);

 // SỬA: Thêm state cho inline edit (Request 1)
 const [editingId, setEditingId] = useState<string | null>(null);
 const [tempName, setTempName] = useState<string>("");

 useEffect(() => {
  const fetchMindmaps = async () => {
 	  if (isAuthed) {
 	 	  try {
 	 	 	  setMindmaps({ loading: true });
 	 	 	  const serverMaps = await mindmapsApi.list();
 	 	 	  setMindmaps({ items: serverMaps, loading: false, error: undefined });
 	 	  } catch (e: any) {
 	 	 	  setMindmaps({ loading: false, error: e?.message || "Load failed" });
 	 	 	  addToast("Tải danh sách mindmap thất bại", "error");
 	 	  }
 	  } else {
 	 	  loadGuests();
 	  }
 	  };
 	  fetchMindmaps();
 }, [isAuthed, setMindmaps, addToast, loadGuests]);


 const filteredMindmaps = useMemo(() => {
 	  if (!searchQuery) return items;
 	  return items.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
 }, [items, searchQuery]);

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

 // SỬA: (Request 1) Logic bắt đầu edit
 const handleRename = (id: string, currentName: string) => {
    setEditingId(id);
    setTempName(currentName);
 };

 // SỬA: (Request 1) Logic lưu tên mới
 const handleSaveRename = async () => {
    if (!editingId || tempName.trim() === "") {
      setEditingId(null);
      return;
    }

    const currentItem = items.find(i => i.id === editingId);
    if (currentItem?.name === tempName) {
      setEditingId(null);
      return;
    }

    try {
      if (isAuthed) {
        await mindmapsApi.updateName(editingId, tempName);
        setMindmaps({ items: items.map(i => i.id === editingId ? { ...i, name: tempName } : i) });
      } else {
        updateGuestName(editingId, tempName); // Đã bao gồm setMindmaps
      }
      addToast("Đổi tên thành công!", "success");
    } catch (error) {
      console.error("Rename failed:", error);
      addToast("Đổi tên thất bại.", "error");
    } finally {
      setEditingId(null);
    }
 };

 const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mindmap này không?")) return;

    try {
      if (isAuthed) {
        await mindmapsApi.delete(id);
        setMindmaps({ items: items.filter(i => i.id !== id) });
      } else {
        removeGuest(id); // Đã bao gồm setMindmaps
      }
      addToast("Đã xóa mindmap", "success");
    } catch (e: any) {
      console.error("Delete failed:", e);
      addToast(e?.message || "Xóa thất bại", "error");
     }
 };
 const handleShare = (id: string) => {
 	  const url = `${window.location.origin}/editor/${id}`;
 	  navigator.clipboard.writeText(url);
 	  addToast("Đã sao chép link!", "success");
 };

 return (
 	  <>
 	 	  <div
 	 	 	  className="fixed top-0 left-0 h-full w-4 z-50"
 	 	 	  onMouseEnter={() => !pinned && setOpen(true)}
 	 	  ></div>

 	 	  <button
 	 	 	  onClick={() => setOpen(!open)}
 	 	 	  onMouseEnter={() => !pinned && setOpen(true)}
 	 	 	  className="fixed top-2 left-4 z-50 w-10 h-10 rounded-lg bg-gray-800/50 hover:bg-gray-700/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
 	 	 	  aria-label="Toggle sidebar"
 	 	  >
 	   	  <PanelLeftOpen />
 	 	  </button>

 	 	  <aside
 	 	 	  ref={sidebarRef}
 	 	 	  onMouseEnter={() => !pinned && setOpen(true)}
 	 	 	  className={`fixed top-0 left-0 h-screen bg-gray-900/95 backdrop-blur text-white z-40 transition-transform duration-300 border-r border-gray-700 flex flex-col ${
 	 	 	 	  open ? "translate-x-0 w-72" : "-translate-x-full w-72"
 	 	 	  }`}
 	 	  >
 	 	 	  <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700 flex-shrink-0" style={{ paddingLeft: '64px' }}>
 	 	 	 	  <span className="font-semibold text-lg">Mindmap Của Tôi</span>
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
 	 	 	 	 	 	  value={searchQuery}
 	 	 	 	 	 	  onChange={(e) => setSearchQuery(e.target.value)}
 	 	 	 	 	 	  className="w-full bg-gray-800 rounded-md py-2 pl-10 pr-3 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
 	 	 	 	 	 	  placeholder="Tìm kiếm mindmap..."
 	 	 	 	 	  />
 	 	 	 	 	  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
 	 	 	 	  </div>
 	 	 	  </div>

 	 	 	  <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
 	 	 	 	  <div className="text-xs text-white/50 px-2 mb-2 font-semibold uppercase">Gần đây</div>
 	 	 	 	  {loading ? (
 	 	 	 	 	 <div className="text-center text-white/40 py-8 text-sm">Đang tải...</div>
 	 	 	 	  ) : filteredMindmaps.length === 0 ? (
 	 	 	 	 	  <div className="text-center text-white/40 py-8 text-sm">Không tìm thấy mindmap nào.</div>
 	 	 	 	  ) : (
 	 	 	 	 	  filteredMindmaps.map((m) => (
 	 	 	 	 	 	  <div key={m.id} className="group relative w-full text-left p-3 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-between">
 	   	 	 	 	 	 	  {editingId === m.id ? (
                              <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={handleSaveRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename();
                                  if (e.key === 'Escape') setEditingId(null);
                             }}
                                className="flex-grow min-w-0 bg-gray-700 text-white font-medium p-1 rounded"
                                autoFocus
                              />
                          ) : (
 	 	 	 	 	 	 	  <a href={`/editor/${m.id}`} className="flex-grow min-w-0">
 	 	 	 	 	 	 	 	  <div className="text-white font-medium truncate">{m.name}</div>
 	 	 	 	 	 	 	 	  <div className="text-gray-400 text-xs mt-1">
 	 	 	 	 	 	 	 	 	  {new Date(m.createdAt).toLocaleDateString("vi-VN")}
 	 	 	 	 	 	 	 	  </div>
 	 	 	 	 	 	 	  </a>
                          )}
 	 	 	 	 	 	 	  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 pl-2">
 	 	 	 	 	 	 	 	  <button onClick={() => handleShare(m.id)} className="p-1.5 rounded hover:bg-gray-700" title="Chia sẻ"><Share2 size={14}/></button>
                                {/* SỬA: (Request 1) Gán sự kiện cho nút edit */}
 	 	 	 	 	 	 	 	  <button onClick={() => handleRename(m.id, m.name)} className="p-1.5 rounded hover:bg-gray-700" title="Đổi tên"><Edit size={14}/></button>
                                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-gray-700 text-red-400" title="Xoá"><Trash2 size={14}/></button>
 	 	 	 	 	 	 	  </div>
 	 	 	 	 	 	  </div>
 	 	 	 	 	  ))
 	 	 	 	  )}
 	 	 	  </div>
 	 	  </aside>
 	  </>
 );
}