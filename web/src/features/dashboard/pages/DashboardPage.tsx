/**
 * Trang Dashboard chính (Router #6).
 * Đây là component "thông minh" (smart) quản lý state của Dashboard.
 * Tái cấu trúc từ `pages/Dashboard.tsx` cũ.
 * Tích hợp Sidebar, List, Modals, và Hooks.
 */
import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useMindmapsStore, MindmapSummary } from "../store/useMindmapsStore";
import { mindmapsApi } from "../services/mindmapApi";
import { useAuth } from "../../auth/hooks/useAuth";
import { useToast } from "../../../core/hooks/useToast";
import { useLocalMindmap } from "../hooks/useLocalMindmap";
import { useSync } from "../hooks/useSync";
import Sidebar from "../../../core/layouts/Sidebar";
import MindmapList from "../components/MindmapList";
import BigStartButton from "../components/BigStartButton";
import Modal from "../../../core/components/Modal/Modal";
import Button from "../../../core/components/Button/Button";
import Spinner from "../../../core/components/Spinner/Spinner";

// Lazy load ShareModal (vì nó nặng)
const ShareModal = lazy(() => import('../../collaboration/components/ShareModal/ShareModal'));

const DashboardPage: React.FC = () => {
    const { isAuthed, login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // --- State Management ---
    const { items, setItems, loading, setLoading, setError, addItem, updateItemName, removeItem } = useMindmapsStore();
    const { loadGuestItems, createGuest, updateGuestName, removeGuest, getGuestDoc, listGuests } = useLocalMindmap();

    // State cho Modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MindmapSummary | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [itemToShare, setItemToShare] = useState<MindmapSummary | null>(null);

    // --- Data Fetching & Sync ---

    // Hàm fetch data chính
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isAuthed) {
                const serverMaps = await mindmapsApi.list();
                setItems(serverMaps);
            } else {
                loadGuestItems(); // Load từ localStorage
            }
        } catch (e: any) {
            console.error("Failed to fetch mindmaps:", e);
            setError(e?.message || "Không thể tải danh sách mindmap.");
            addToast("Không thể tải danh sách mindmap", "error");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthed, setLoading, setError, setItems, loadGuestItems, addToast]);

    // Hook đồng bộ Guest -> Server
    useSync(fetchData); // Sau khi sync, gọi fetchData

    // Fetch data lần đầu khi mount (hoặc khi auth state thay đổi)
    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // --- Global Event Handlers ---
    
    // Tạo mới (User Story #1, #36)
    const handleCreateNew = useCallback(async () => {
        setLoading(true);
        try {
            let newItemId: string;
            if (isAuthed) {
                const created = await mindmapsApi.create({ name: "Mindmap mới" });
                addItem(created); // Thêm vào store
                newItemId = created.id;
            } else {
                const guestItem = createGuest(); // Tự thêm vào store
                newItemId = guestItem.id;
            }
            navigate(`/editor/${newItemId}`); // Chuyển trang
        } catch (e) {
            console.error("Failed to create mindmap:", e);
            addToast("Không thể tạo mindmap mới", "error");
            setLoading(false);
        }
        // setLoading(false) sẽ được trigger bởi EditorPage
    }, [isAuthed, createGuest, addItem, navigate, addToast, setLoading]);

    // Lắng nghe event từ Sidebar/BigStartButton
    useEffect(() => {
        const createHandler = () => handleCreateNew();
        window.addEventListener("mm:create", createHandler);
        
        const shareHandler = (e: Event) => {
             const detail = (e as CustomEvent).detail;
             if (detail?.id) {
                 const map = items.find(i => i.id === detail.id);
                 if (map) {
                     setItemToShare(map);
                     setIsShareModalOpen(true);
                 }
             }
        };
        window.addEventListener("mm:share", shareHandler);
        
        return () => {
            window.removeEventListener("mm:create", createHandler);
            window.removeEventListener("mm:share", shareHandler);
        };
    }, [handleCreateNew, items]);

    // --- Card Action Handlers ---

    // Đổi tên (User Story #1)
    const handleRename = useCallback(async (id: string, newName: string) => {
        const originalItems = items;
        const now = new Date().toISOString();
        updateItemName(id, newName, now); // Optimistic
        
        try {
            if (id.startsWith('guest-')) {
                updateGuestName(id, newName);
            } else if (isAuthed) {
                const updatedMap = await mindmapsApi.updateName(id, newName);
                updateItemName(id, updatedMap.name, updatedMap.updatedAt); // Corrected
            }
            addToast("Đã đổi tên mindmap!", "success");
        } catch (error) {
            console.error("Rename failed:", error);
            addToast("Đổi tên thất bại!", "error");
            setItems(originalItems); // Revert
        }
    }, [items, isAuthed, updateItemName, setItems, updateGuestName, addToast]);

    // Mở Modal Xóa (User Story #3)
    const openDeleteModal = useCallback((id: string) => {
        const item = items.find(i => i.id === id);
        if (item) {
            setItemToDelete(item);
            setIsDeleteModalOpen(true);
        }
    }, [items]);

    // Xác nhận Xóa (User Story #2)
    const confirmDelete = useCallback(async () => {
        if (!itemToDelete) return;
        const idToDelete = itemToDelete.id;
        const nameToDelete = itemToDelete.name;
        
        setIsDeleteModalOpen(false);
        const originalItems = items;
        removeItem(idToDelete); // Optimistic

        try {
            if (idToDelete.startsWith('guest-')) {
                removeGuest(idToDelete);
            } else if (isAuthed) {
                await mindmapsApi.delete(idToDelete);
            }
            addToast(`Đã xóa "${nameToDelete}"`, "success");
            setItemToDelete(null);
        } catch (error) {
            console.error("Delete failed:", error);
            addToast(`Xóa "${nameToDelete}" thất bại!`, "error");
            setItems(originalItems); // Revert
            setItemToDelete(null);
        }
    }, [itemToDelete, items, isAuthed, removeItem, removeGuest, setItems, addToast]);

    // Mở Modal Share (User Story #18)
    const openShareModal = useCallback((id: string) => {
         const item = items.find(i => i.id === id);
         if(item) {
             setItemToShare(item);
             setIsShareModalOpen(true);
         } else if (!isAuthed && id.startsWith('guest-')) {
             addToast("Đăng nhập để chia sẻ mindmap của bạn!", "info");
             login();
         }
    }, [items, isAuthed, login, addToast]);
    
    // Nhân bản (User Story #5)
    const handleDuplicate = useCallback(async (id: string) => {
        setLoading(true);
        try {
            let newMapData: MindmapSummary;
            if (id.startsWith('guest-')) {
                const sourceDoc = getGuestDoc(id);
                if (sourceDoc) {
                    const newGuest = createGuest();
                    const newName = `Bản sao của ${sourceDoc.name}`;
                    updateGuestName(newGuest.id, newName);
                    // Cập nhật content
                    const docs = JSON.parse(localStorage.getItem("mm_guest_docs_v2") || "{}");
                    docs[newGuest.id] = { ...sourceDoc, id: newGuest.id, name: newName, version: 1 };
                    localStorage.setItem("mm_guest_docs_v2", JSON.stringify(docs));
                    newMapData = { ...newGuest, name: newName };
                } else { throw new Error("Không tìm thấy dữ liệu mindmap gốc."); }
            } else if (isAuthed) {
                const duplicatedMap = await mindmapsApi.duplicate(id);
                newMapData = duplicatedMap; // API trả về MindmapSummary
                addItem(newMapData);
            } else { throw new Error("Không thể nhân bản."); }
            
            addToast(`Đã nhân bản "${newMapData.name}"!`, "success");
            navigate(`/editor/${newMapData.id}`); // Mở map mới
        } catch (error: any) {
            console.error("Duplicate failed:", error);
            addToast(`Nhân bản thất bại: ${error.message || 'Lỗi không xác định'}`, "error");
            setLoading(false);
        }
        // setLoading(false) sẽ được trigger bởi EditorPage
    }, [isAuthed, addToast, createGuest, updateGuestName, getGuestDoc, addItem, setLoading, navigate]);


    // --- Render ---
    return (
        <>
            {/* Sidebar (từ GĐ3a, tái cấu trúc từ GĐ2) */}
            {/* Truyền props actions xuống Sidebar */}
            <Sidebar
                items={items}
                isLoading={loading}
                error={error}
                onFetchData={fetchData}
                onCreate={handleCreateNew}
                onRename={handleRename}
                onDelete={openDeleteModal}
                onShare={openShareModal}
                onDuplicate={handleDuplicate}
            />

            {/* Main Content Area (bên phải Sidebar) */}
            <main className="pl-0 md:pl-72 transition-all duration-300"> {/* Phải khớp với width của Sidebar */}
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    {loading && items.length === 0 ? (
                        <div className="flex justify-center items-center h-[calc(100vh-150px)]">
                            <Spinner size="lg" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex justify-center items-center h-[calc(100vh-150px)]">
                            <BigStartButton />
                        </div>
                    ) : (
                        <MindmapList
                            items={items}
                            onRename={handleRename}
                            onDelete={openDeleteModal}
                            onShare={openShareModal}
                            onDuplicate={handleDuplicate}
                        />
                    )}
                </div>
            </main>

            {/* Modals (Quản lý bởi trang này) */}
            
            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận xóa">
                <p className="text-gray-300 mb-6">
                    Bạn có chắc chắn muốn xóa mindmap "<strong>{itemToDelete?.name}</strong>"? (User Story #3)
                    <br />
                    Hành động này không thể hoàn tác.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Hủy bỏ</Button>
                    <Button variant="danger" onClick={confirmDelete}>
                        Xóa vĩnh viễn
                    </Button>
                </div>
            </Modal>
            
            {/* Share Modal (Lazy Loaded) */}
            <Suspense>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        mindmap={itemToShare}
                    />
                )}
            </Suspense>
        </>
    );
};

export default DashboardPage;
