import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useMindmapsStore } from "../../app/store/useMindmapsStore";
import { useEditorStore } from "../../app/store/useEditorStore"; 
import { Plus, Search, Edit, Trash2, Share2, PanelLeftOpen, Pin, PinOff } from 'lucide-react';
import { useToast } from "../../hooks/useToast";
import { mindmapsApi } from "../../services/mindmapsApi";
import { useLocalMindmap } from "../../hooks/useLocalMindmap";
import ConfirmModal from "../common/ConfirmModal";

const PIN_KEY = "mm_sidebar_pinned";

export default function Sidebar() {
  const { isAuthed } = useAuth();
  const { addToast } = useToast();
  const { items, set: setMindmaps, loading } = useMindmapsStore();
  const { load: loadGuests, updateGuestName, removeGuest } = useLocalMindmap();
  
  const currentMindmapId = useEditorStore(s => s.currentMindmapId);
  const setEditorStore = useEditorStore(s => s.set);

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) === "1");
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasFetched = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMindmaps = async () => {
      if (isAuthed) {
        try {
          if (items.length === 0) setMindmaps({ loading: true });
          
          const serverMaps = await mindmapsApi.list();
          
          if (isMounted) {
             setMindmaps({ items: serverMaps, loading: false, error: undefined });
          }
        } catch (e: any) {
          if (isMounted) {
            if (e.response?.status !== 429) {
                setMindmaps({ loading: false, error: e?.message || "Load failed" });
                addToast("Tải danh sách mindmap thất bại", "error");
            } else {
                setMindmaps({ loading: false }); 
            }
          }
        }
      } else {
        loadGuests();
      }
    };

    fetchMindmaps();
    
    return () => { isMounted = false; };
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

      if (editingId === currentMindmapId) {
        setEditorStore({ currentMindmapName: tempName });
      }

      addToast("Đổi tên thành công!", "success");
    } catch (error) {
      console.error("Rename failed:", error);
      addToast("Đổi tên thất bại.", "error");
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;

    const isDeletingCurrent = deletingId === currentMindmapId;

    try {
      if (isAuthed) {
        await mindmapsApi.delete(deletingId);
        setMindmaps({ items: items.filter(i => i.id !== deletingId) });
      } else {
        removeGuest(deletingId); 
      }
      addToast("Đã xóa mindmap", "success");
      
      if (isDeletingCurrent) {
        window.location.href = '/dashboard';
      }
    } catch (e: any) {
      console.error("Delete failed:", e);
      addToast(e?.message || "Xóa thất bại", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingId(null);
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
          className="fixed top-3 left-3.5 z-50 w-5 h-5 rounded-lg bg-white/100 hover:bg-gray-200/80 text-gray-800 flex items-center justify-center transition-colors backdrop-blur-sm" 
          aria-label="Toggle sidebar"
        >
          <PanelLeftOpen />
        </button>

        <aside
          ref={sidebarRef}
          onMouseEnter={() => !pinned && setOpen(true)}
          className={`fixed top-0 left-0 h-screen bg-white/95 backdrop-blur text-gray-900 z-40 transition-transform duration-300 border-r border-gray-200 flex flex-col ${open ? "translate-x-0 w-72" : "-translate-x-full w-72"}`}
          style={{ fontFamily: 'Arial' }}
        >
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0" style={{ paddingLeft: '64px' }}>
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
                placeholder=""
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /> 
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 custom-scrollbar">
            <div className="text-xs text-gray-900/50 px-2 mb-2 font-semibold uppercase">Gần đây</div> 
            {loading ? (
                <div className="text-center text-gray-900/40 py-8 text-sm">Đang tải...</div> 
            ) : filteredMindmaps.length === 0 ? (
              <div className="text-center text-gray-900/40 py-8 text-sm">Không tìm thấy mindmap nào.</div> 
            ) : (
              filteredMindmaps.map((m) => (
                <div 
                  key={m.id} 
                  className={`group relative w-full text-left p-2 rounded-md transition-colors flex items-center justify-between ${m.id === currentMindmapId ? 'bg-gradient-to-r from-blue-50 to-purple-100' : 'hover:bg-gray-100'}`}
                >
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
                      <div className="text-sm text-gray-900 font-medium truncate">{m.name}</div> 
                      <div className="text-gray-500 text-xs mt-1"> 
                        {(m.updatedAt || m.createdAt) ? new Date(m.updatedAt || m.createdAt).toLocaleDateString("vi-VN", { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}
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
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingId(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Xác nhận xóa Mindmap"
          message="Bạn có chắc chắn muốn xóa mindmap này không? Thao tác này không thể hoàn tác."
          confirmText="Xác nhận Xóa"
        />
      </>
  );
}