// src/components/layout/Sidebar.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useMindmapsStore } from "../../app/store/useMindmapsStore";
import { Plus, Search, Edit, Trash2, Share2, PanelLeftOpen, Pin, PinOff } from 'lucide-react';
import { useToast } from "../../hooks/useToast";
import { mindmapsApi } from "../../services/mindmapsApi";
import { useLocalMindmap } from "../../hooks/useLocalMindmap";

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
// Logic bên trong (fetchMindmaps, handleSaveRename, v.v.)
// đã khớp với logic GĐ 1-10 của chúng ta.

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

 const handleRename = (id: string, currentName: string) => {
    setEditingId(id);
    setTempName(currentName);
 };

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
        updateGuestName(editingId, tempName);
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
        removeGuest(id); 
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
 	 	 	  className="fixed top-3 left-3 z-50 w-5 h-5 rounded-lg bg-white/50 hover:bg-gray-100/80 text-gray-800 flex items-center justify-center transition-colors backdrop-blur-sm" 
 	 	 	  aria-label="Toggle sidebar"
 	 	  >
 	   	  <PanelLeftOpen />
 	 	  </button>

 	 	  <aside
 	 	 	  ref={sidebarRef}
 	 	 	  onMouseEnter={() => !pinned && setOpen(true)}
 	 	 	  className={`fixed top-0 left-0 h-screen bg-white/95 backdrop-blur text-gray-900 z-40 transition-transform duration-300 border-r border-gray-200 flex flex-col ${open ? "translate-x-0 w-72" : "-translate-x-full w-72"}`}
 	 	  >
 	 	 	  <div className="h-11 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0" style={{ paddingLeft: '64px' }}> 
 	 	 	 	  <span className="font-semibold text-lg">Mindmap của tôi</span>
 	 	 	 	  <button
 	 	 	 	 	  onClick={() => setPinned(!pinned)}
 	 	 	 	 	  className="p-2 rounded-md hover:bg-gray-200" 
 	 	 	 	 	  title={pinned ? "Bỏ ghim" : "Ghim sidebar"}
 	 	 	 	  >
 	 	 	 	 	  {pinned ? <PinOff size={15} /> : <Pin size={15} />}
 	 	 	 	  </button>
 	 	 	  </div>

 	 	 	  <div className="px-4 py-4 space-y-3 border-b border-gray-200"> 
 	 	 	 	  <button
 	 	 	 	 	  onClick={handleCreateNew}
 	 	 	 	 	  className="w-full py-1 rounded-lg text-gray font-medium bg-gradient-to-r from-purple-100 to-blue-100 hover:from-blue-200 hover:to-purple-200 transition-all flex items-center justify-center gap-2"
 	 	 	 	  >
 	 	 	 	 	  <Plus size={30} /> Mindmap mới
 	 	 	 	  </button>
 	 	 	 	  <div className="relative">
 	 	 	 	 	  <input
 	 	 	 	 	 	  type="text"
 	 	 	 	 	 	  value={searchQuery}
 	 	 	 	 	 	  onChange={(e) => setSearchQuery(e.target.value)}
 	 	 	 	 	 	  className="w-full bg-gray-100 rounded-md py-2 pl-10 pr-3 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500" 
 	 	 	 	 	 	  placeholder="Tìm kiếm mindmap..."
 	 	 	 	 	  />
 	 	 	 	 	  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /> 
 	 	 	 	  </div>
 	 	 	  </div>

 	 	 	  <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
 	 	 	 	  <div className="text-xs text-gray-900/50 px-2 mb-2 font-semibold uppercase">Gần đây</div> 
 	 	 	 	  {loading ? (
 	 	 	 	 	 <div className="text-center text-gray-900/40 py-8 text-sm">Đang tải...</div> 
 	 	 	 	  ) : filteredMindmaps.length === 0 ? (
 	 	 	 	 	  <div className="text-center text-gray-900/40 py-8 text-sm">Không tìm thấy mindmap nào.</div> 
 	 	 	 	  ) : (
 	 	 	 	 	  filteredMindmaps.map((m) => (
 	 	 	 	 	 	  <div key={m.id} className="group relative w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-between">
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
                                className="flex-grow min-w-0 bg-gray-200 text-gray-900 font-medium p-1 rounded" 
                                autoFocus
                              />
                          ) : (
 	 	 	 	 	 	 	  <a href={`/editor/${m.id}`} className="flex-grow min-w-0">
 	 	 	 	 	 	 	 	  <div className="text-gray-900 font-medium truncate">{m.name}</div> 
 	 	 	 	 	 	 	 	  <div className="text-gray-500 text-xs mt-1"> 
 	 	 	 	 	 	 	 	 	  {new Date(m.createdAt).toLocaleDateString("vi-VN")}
 	 	 	 	 	 	 	 	  </div>
 	 	 	 	 	 	 	  </a>
                          )}
 	 	 	 	 	 	 	  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 pl-2">
 	 	 	 	 	 	 	 	  <button onClick={() => handleShare(m.id)} className="p-1.5 rounded hover:bg-gray-200" title="Chia sẻ"><Share2 size={14}/></button>
 	 	 	 	 	 	 	 	  <button onClick={() => handleRename(m.id, m.name)} className="p-1.5 rounded hover:bg-gray-200" title="Đổi tên"><Edit size={14}/></button>
                                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-gray-200 text-red-500" title="Xoá"><Trash2 size={14}/></button>
 	 	 	 	 	 	 	  </div>
 	 	 	 	 	 	  </div>
 	 	 	 	 	  ))
 	 	 	 	  )}
 	 	 	  </div>
 	 	  </aside>
 	  </>
 );
}