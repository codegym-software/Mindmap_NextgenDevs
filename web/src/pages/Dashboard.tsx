// src/pages/Dashboard.tsx
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import BigStartButton from "../components/dashboard/BigStartButton";
import MindmapCard from "../components/dashboard/MindmapCard";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import { useEffect, useMemo, useState, useCallback } from "react"; // Thêm useCallback
import { useLocalMindmap } from "../hooks/useLocalMindmap";
import { useMindmapsStore, type MindmapItem } from "../app/store/useMindmapsStore";
import { mindmapsApi } from "../services/mindmapsApi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export default function Dashboard() {
  const { createGuest, load: loadGuests, removeGuest, updateGuestName } = useLocalMindmap();
  const { items, set: setMindmaps, loading } = useMindmapsStore();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const authed = isAuthenticated();

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [mindmapToDelete, setMindmapToDelete] = useState<string | null>(null);

  // BỌC HÀM TRONG useCallback ĐỂ ĐẢM BẢO TÍNH ỔN ĐỊNH
  const fetchMindmaps = useCallback(async () => {
    if (authed) {
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
  }, [authed, setMindmaps, addToast, loadGuests]);

  // SỬ DỤNG HÀM ĐÃ ĐƯỢC MEMOIZE LÀM DEPENDENCY
  useEffect(() => {
    fetchMindmaps();
  }, [fetchMindmaps]);

  const handleCreateNew = async () => {
    try {
      if (authed) {
        const created = await mindmapsApi.createAndOpen();
        window.location.href = `/editor/${created.id}`;
      } else {
        const g = createGuest();
        window.location.href = `/editor/${g.id}`;
      }
    } catch (e) {
      console.error("Failed to create mindmap:", e);
      addToast("Không thể tạo mindmap mới", "error");
    }
  };

  useEffect(() => {
    window.addEventListener("mm:create" as any, handleCreateNew);
    return () => window.removeEventListener("mm:create" as any, handleCreateNew);
  }, [authed, createGuest]);

  const handleRename = async (id: string, newName: string) => {
    try {
      if(id.startsWith('guest-')) {
        updateGuestName(id, newName);
      } else {
        await mindmapsApi.updateName(id, newName);
      }
      addToast("Đổi tên thành công!", "success");
      fetchMindmaps();
    } catch {
      addToast("Đổi tên thất bại.", "error");
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/editor/${id}`;
    navigator.clipboard.writeText(url);
    addToast("Đã sao chép link!", "success");
  };

  const openDeleteConfirmation = (id: string) => {
    setMindmapToDelete(id);
    setDeleteModalOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!mindmapToDelete) return;
    try {
      if (mindmapToDelete.startsWith('guest-')) {
        removeGuest(mindmapToDelete);
      } else {
        await mindmapsApi.delete(mindmapToDelete);
      }
      addToast("Xóa mindmap thành công!", "success");
      fetchMindmaps();
    } catch {
      addToast("Xóa thất bại.", "error");
    } finally {
      setDeleteModalOpen(false);
      setMindmapToDelete(null);
    }
  };

  const top7 = useMemo(() => items.slice(0, 7), [items]);
  const rows: MindmapItem[][] = useMemo(
    () => [top7.slice(0, 2), top7.slice(2, 5), top7.slice(5, 7)],
    [top7]
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <Header />
        <Sidebar />
        <main className="pt-16 sm:pl-16">
          <section className="h-[45vh] border-b border-gray-700 flex items-center justify-center">
            <BigStartButton />
          </section>

          <section className="max-w-6xl mx-auto py-10 px-4">
            <div className="relative mb-8">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
              <div className="relative text-center">
                <span className="bg-gray-900 px-4 text-white/80">
                  Hoặc chọn một mindmap đã có
                </span>
              </div>
            </div>

            {loading ? <div className="text-center text-white/50">Đang tải...</div> : 
            <div className="space-y-6">
              {[0, 1, 2].map((r) => (
                <div key={r} className={`grid gap-4 md:gap-6 ${ r === 1 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2" } max-w-5xl mx-auto`}>
                  {rows[r].map((m: MindmapItem) => (
                    <MindmapCard 
                      key={m.id} 
                      item={m}
                      onRename={handleRename}
                      onDelete={openDeleteConfirmation}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              ))}
            </div>}
          </section>
        </main>
      </div>

      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        title="Xác nhận Xóa"
      >
        <p className="text-gray-300 mb-6">Bạn có chắc chắn muốn xóa mindmap này không? Hành động này không thể hoàn tác.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Hủy</Button>
          <Button variant="gradient" onClick={confirmDelete} className="!bg-red-600 hover:!bg-red-700">Xác nhận Xóa</Button>
        </div>
      </Modal>
    </>
  );
}