/**
 * Trang Dashboard chính (Router #6).
 * Tái cấu trúc từ `pages/Dashboard.tsx` (code gốc).
 * Đây là component "thông minh" (smart) quản lý toàn bộ state và logic của Dashboard.
 * Tích hợp Sidebar, List, Modals, và Hooks.
 * Tuân thủ User Story #1-5, #18 (Share), #36 (Guest).
 */
import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";

// --- State & Hooks ---
import { useMindmapsStore, MindmapSummary } from "../store/useMindmapsStore";
import { useAuth } from "../../auth/hooks/useAuth";
import { useToast } from "../../../core/hooks/useToast";
import { useLocalMindmap } from "../hooks/useLocalMindmap"; // (Đã tạo ở GĐ3a)
import { useSync } from "../hooks/useSync"; // (Đã tạo ở GĐ3a)

// --- API ---
import { mindmapsApi } from "../services/mindmapsApi"; // (Đã tạo ở GĐ3a)

// --- Components (Tái cấu trúc từ code gốc) ---
import Header from "../../../core/layouts/Header"; // (Đã tạo ở GĐ2b)
import Sidebar from "../../../core/layouts/Sidebar"; // (Đã tạo ở GĐ3b)
import MindmapList from "../components/MindmapList"; // (Đã tạo ở GĐ3b)
import BigStartButton from "../components/BigStartButton"; // (Đã tạo ở GĐ3a)
import Modal from "../../../core/components/Modal/Modal"; // (Đã tạo ở GĐ2b)
import Button from "../../../core/components/Button/Button"; // (Đã tạo ở GĐ2b)
import Spinner from "../../../core/components/Spinner/Spinner"; // (Đã tạo ở GĐ2b)

// --- Lazy Load Components ---
const ShareModal = lazy(() => import('../../collaboration/components/ShareModal/ShareModal'));

// --- Component Chính ---
const DashboardPage: React.FC = () => {
    const { isAuthed, login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // --- State Management ---
    // Lấy state và actions từ store
    const { items, setItems, loading, setLoading, setError, addItem, updateItemName, removeItem } = useMindmapsStore();
    // Lấy actions cho Guest Mode
    const { loadGuestItems, createGuest, updateGuestName, removeGuest, getGuestDoc } = useLocalMindmap();

    // --- Local State (Quản lý Modals) ---
    const [itemToDelete, setItemToDelete] = useState<MindmapSummary | null>(null);
    const [itemToShare, setItemToShare] = useState<MindmapSummary | null>(null);

    // --- Data Fetching & Sync ---

    // Hàm fetch data chính (Auth hoặc Guest)
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (isAuthed) {
                const serverMaps = await mindmapsApi.list();
                setItems(serverMaps);
            } else {
                loadGuestItems(); // Tải từ localStorage
                setLoading(false); // (loadGuestItems không tự set loading)
            }
        } catch (e: any) {
            console.error("Fetch data failed:", e);
            setError(e?.message || "Không thể tải danh sách mindmap.");
            addToast("Không thể tải danh sách mindmap", "error");
        }
    }, [isAuthed, setLoading, setItems, setError, loadGuestItems, addToast]);

    // Hook đồng bộ (Chỉ chạy 1 lần khi login)
    // `fetchData` được truyền làm callback `onSyncComplete`
    useSync(fetchData);

    // Fetch data lần đầu khi component mount hoặc auth state thay đổi
    useEffect(() => {
        fetchData();
    }, [fetchData]); // `fetchData` là stable

    // --- Global Event Handlers ---

    // Xử lý sự kiện "mm:create" (từ Sidebar hoặc BigStartButton)
    // (User Story #1, #36)
    const handleCreateNew = useCallback(async () => {
        setLoading(true); // Hiển thị loading (vì có thể gọi API)
        try {
            if (isAuthed) {
                // 1. User đã đăng nhập -> Gọi API tạo mới
                const createdMap = await mindmapsApi.create({ name: "Mindmap mới" });
                addItem(createdMap); // Thêm vào store
                navigate(`/editor/${createdMap.id}`); // Chuyển trang
            } else {
                // 2. User là Guest -> Dùng hook local
                const guestItem = createGuest(); // Hook này đã tự cập nhật store
                navigate(`/editor/${guestItem.id}`); // Chuyển trang
            }
        } catch (e) {
            console.error("Failed to create mindmap:", e);
            addToast("Không thể tạo mindmap mới", "error");
            setLoading(false); // Tắt loading nếu lỗi
        }
        // setLoading(false) sẽ được gọi bởi `setItems` trong `fetchData` (nếu là auth)
        // hoặc tự tắt (nếu là guest)
        if (!isAuthed) setLoading(false);
    }, [isAuthed, createGuest, navigate, addToast, setLoading, addItem]);
    
    // Lắng nghe event global `mm:create`
    useEffect(() => {
        const createHandler = () => handleCreateNew();
        window.addEventListener("mm:create", createHandler);
        return () => window.removeEventListener("mm:create", createHandler);
    }, [handleCreateNew]);


    // --- Card Action Handlers (truyền xuống Sidebar/MindmapList) ---

    // User Story #1
    const handleRename = useCallback(async (id: string, currentName: string) => {
        const newName = prompt("Nhập tên mới:", currentName);
        if (!newName || newName.trim() === "" || newName === currentName) return;

        const trimmedName = newName.trim();
        const originalItems = [...items];
        const now = new Date().toISOString();
        
        // Cập nhật Optimistic
        updateItemName(id, trimmedName, now);

        try {
            if (id.startsWith('guest-')) {
                updateGuestName(id, trimmedName); // Logic Guest
            } else if (isAuthed) {
                const updatedMap = await mindmapsApi.updateName(id, trimmedName); // Logic Auth
                updateItemName(id, updatedMap.name, updatedMap.updatedAt); // Cập nhật lại với data chuẩn
            }
            addToast("Đã đổi tên mindmap!", "success");
        } catch (error) {
            addToast("Đổi tên thất bại!", "error");
            setItems(originalItems); // Rollback
        }
    }, [items, isAuthed, updateItemName, setItems, updateGuestName, addToast]);

    // User Story #2, #3
    const openDeleteModal = useCallback((id: string) => {
        const item = items.find(i => i.id === id);
        if (item) setItemToDelete(item);
    }, [items]);

    const confirmDelete = useCallback(async () => {
        if (!itemToDelete) return;
        
        const { id: idToDelete, name: nameToDelete } = itemToDelete;
        const originalItems = [...items];
        
        setItemToDelete(null); // Đóng modal
        removeItem(idToDelete); // Cập nhật Optimistic

        try {
            if (idToDelete.startsWith('guest-')) {
                removeGuest(idToDelete); // Logic Guest
            } else if (isAuthed) {
                await mindmapsApi.delete(idToDelete); // Logic Auth
            }
            addToast(`Đã xóa "${nameToDelete}"`, "success");
        } catch (error) {
            addToast(`Xóa "${nameToDelete}" thất bại!`, "error");
            setItems(originalItems); // Rollback
        }
    }, [itemToDelete, items, isAuthed, removeItem, removeGuest, setItems, addToast]);
    
    // User Story #5
    const handleDuplicate = useCallback(async (id: string) => {
        addToast("Đang nhân bản...", "info");
        try {
            let newMapData: MindmapSummary;

            if (id.startsWith('guest-')) {
                const doc = getGuestDoc(id);
                if (!doc) throw new Error("Không tìm thấy dữ liệu mindmap gốc.");
                
                const newGuest = createGuest(); // Tạo mới hoàn toàn
                const newName = `Bản sao của ${doc.name}`;
                updateGuestName(newGuest.id, newName); // Đổi tên
                
                // Cập nhật content
                const docs = JSON.parse(localStorage.getItem("mm_guest_docs_v2") || "{}");
                docs[newGuest.id] = { ...doc, id: newGuest.id, name: newName, version: 1 };
                localStorage.setItem("mm_guest_docs_v2", JSON.stringify(docs));
                newMapData = { ...newGuest, name: newName, updatedAt: newGuest.createdAt };
            
            } else if (isAuthed) {
                const duplicatedMap = await mindmapsApi.duplicate(id); // Endpoint #6
                newMapData = { // Chuyển Detail response thành Summary
                    id: duplicatedMap.id, name: duplicatedMap.name, ownerId: duplicatedMap.ownerId,
                    createdAt: duplicatedMap.createdAt, updatedAt: duplicatedMap.updatedAt,
                    accessSettings: duplicatedMap.accessSettings
                };
                addItem(newMapData); // Thêm vào store
            } else {
                throw new Error("Không thể nhân bản khi offline.");
            }
            
            addToast(`Đã nhân bản "${newMapData.name}"!`, "success");
            navigate(`/editor/${newMapData.id}`); // Mở map mới

        } catch (error: any) {
            addToast(`Nhân bản thất bại: ${error.message}`, "error");
        }
    }, [isAuthed, addToast, createGuest, updateGuestName, getGuestDoc, addItem, navigate]);

    // User Story #18
    const openShareModal = useCallback((id: string) => {
         const item = items.find(i => i.id === id);
         if(item) {
             if (isAuthed && !id.startsWith('guest-')) {
                setItemToShare(item); // Mở modal
             } else {
                // Yêu cầu đăng nhập nếu là guest
                addToast("Đăng nhập để chia sẻ mindmap của bạn!", "info");
                login('login');
             }
         }
    }, [items, isAuthed, login, addToast]);


    // --- Render (Sử dụng UI gốc của bạn) ---
    return (
        <>
            {/* SỬA: Giao diện (UI) gốc của bạn từ `pages/Dashboard.tsx` 
                được giữ nguyên 100%.
                Logic được truyền vào qua props.
            */}
            <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
                <Header />
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
                
                {/* SỬA: MainLayout cũ (GĐ2b) không cần thiết
                    vì DashboardPage tự quản lý layout.
                    Phần `md:pl-72` (padding) sẽ được quản lý bởi Sidebar.
                */}
                <main className="transition-all duration-300 md:pl-72"> {/* pl-72 khớp với width của Sidebar */}
                    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                        {loading && items.length === 0 ? (
                            <div className="flex justify-center items-center h-[calc(100vh-150px)]">
                                <Spinner size="lg" />
                            </div>
                        ) : items.length === 0 ? (
                            // (UI Gốc) Hiển thị nút "Bắt đầu"
                            <BigStartButton onClick={handleCreateNew} />
                        ) : (
                            // (UI Gốc) Hiển thị danh sách grid
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
            </div>

            {/* Modals (Giữ nguyên logic) */}
            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Xác nhận xóa">
                <p className="text-gray-300 mb-6">
                    Bạn có chắc chắn muốn xóa mindmap "<strong>{itemToDelete?.name}</strong>"? (User Story #3)
                    <br />Hành động này không thể hoàn tác.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setItemToDelete(null)}>Hủy bỏ</Button>
                    <Button variant="danger" onClick={confirmDelete}>Xóa vĩnh viễn</Button>
                </div>
            </Modal>
            
            <Suspense fallback={<Spinner />}>
                {itemToShare && (
                    <ShareModal
                        isOpen={!!itemToShare}
                        onClose={() => setItemToShare(null)}
                        mindmap={itemToShare}
                        onSettingsChange={(newSettings) => {
                             // Cập nhật state (optimistic)
                             updateItemName(itemToShare.id, itemToShare.name, new Date().toISOString());
                        }}
                    />
                )}
            </Suspense>
        </>
    );
};

export default DashboardPage;

