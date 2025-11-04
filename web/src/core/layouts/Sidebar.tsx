/**
 * Sidebar chính của ứng dụng.
 * Tái cấu trúc từ `components/layout/Sidebar.tsx` cũ.
 * Sẽ được render bởi `DashboardPage.tsx`.
 * Đầy đủ tính năng: Pin, Search, List, Actions, Modals.
 * Tuân thủ User Story #4 (Search), #36 (Guest).
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useMindmapsStore, MindmapSummary } from "../../features/dashboard/store/useMindmapsStore";
import { Plus, Search, Edit, Trash2, Share2, MoreVertical, Pin, PinOff, LogOut, Settings, HelpCircle, Loader2, Copy } from 'lucide-react'; // Thêm Copy
import { useToast } from "../hooks/useToast";
import { mindmapsApi } from "../../features/dashboard/services/mindmapsApi";
import { useLocalMindmap } from "../../features/dashboard/hooks/useLocalMindmap";
import Modal from "../components/Modal/Modal";
import Button from "../components/Button/Button";
import { useClickOutside } from "../hooks/useClickOutside";

const PIN_KEY = "mindmap_sidebar_pinned_v1";

// --- Sidebar Item Menu (Internal Component) ---
interface ItemMenuProps {
    item: MindmapSummary;
    onRename: (id: string, currentName: string) => void;
    onDelete: (item: MindmapSummary) => void; // Truyền cả item để modal có tên
    onShare: (id: string) => void;
    onDuplicate: (id: string) => void;
    onClose: () => void;
}

const ItemMenu: React.FC<ItemMenuProps> = ({ item, onRename, onDelete, onShare, onDuplicate, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useClickOutside(menuRef, onClose); // Tự động đóng khi click ra ngoài

    const handleRenameClick = () => {
        onClose();
        const newName = prompt("Nhập tên mới:", item.name);
        if (newName && newName.trim() && newName.trim() !== item.name) {
            onRename(item.id, newName.trim());
        }
    };

    return (
        <div ref={menuRef} className="absolute top-full right-0 mt-1 w-44 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 py-1 animate-fade-in-down-sm">
            <button onClick={handleRenameClick} className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2">
                <Edit size={14} /> Đổi tên
            </button>
            <button onClick={() => { onDuplicate(item.id); onClose(); }} className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2">
                <Copy size={14} /> Nhân bản
            </button>
            <button onClick={() => { onShare(item.id); onClose(); }} className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2">
                <Share2 size={14} /> Chia sẻ
            </button>
            <div className="h-px bg-gray-700 my-1" />
            <button onClick={() => { onDelete(item); onClose(); }} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/80 hover:text-white flex items-center gap-2">
                <Trash2 size={14} /> Xóa
            </button>
        </div>
    );
};


// --- Main Sidebar Component ---
// (Component này sẽ được DashboardPage import và render)
const Sidebar: React.FC = () => {
    const { isAuthed, logout } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const { items, setItems, loading, setLoading, setError, addItem, updateItemName, removeItem } = useMindmapsStore();
    const { loadGuestItems, createGuest, listGuests, updateGuestName: updateGuest, removeGuest } = useLocalMindmap();

    const [isOpen, setIsOpen] = useState(true); // Mặc định mở
    const [isPinned, setIsPinned] = useState(() => localStorage.getItem(PIN_KEY) === "true");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MindmapSummary | null>(null);

    const sidebarRef = useRef<HTMLElement>(null);

    // --- Data Fetching Logic (Được gọi từ DashboardPage) ---
    // (Bỏ logic fetch/sync, DashboardPage sẽ quản lý)

    // --- Filtering Logic (User Story #4) ---
    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return items;
        return items.filter(m => m.name.toLowerCase().includes(query));
    }, [items, searchQuery]);
    
    // Sắp xếp items theo ngày cập nhật
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => 
            new Date(b.updatedAt || b.createdAt).getTime() - 
            new Date(a.updatedAt || a.createdAt).getTime()
        );
    }, [filteredItems]);


    // --- Pinning Logic ---
    useEffect(() => {
        localStorage.setItem(PIN_KEY, isPinned ? "true" : "false");
        if (isPinned) setIsOpen(true);
    }, [isPinned]);

    // Auto-close on mouse leave if not pinned
    useEffect(() => {
        if (isPinned || !isOpen) return;
        const sidebarElement = sidebarRef.current;
        const handleMouseLeave = (event: MouseEvent) => {
             if (sidebarElement && !sidebarElement.contains(event.relatedTarget as Node)) {
                 setIsOpen(false);
             }
        };
        sidebarElement?.addEventListener("mouseleave", handleMouseLeave);
        return () => sidebarElement?.removeEventListener("mouseleave", handleMouseLeave);
    }, [isPinned, isOpen]);
    
    // Đóng menu item khi click ra ngoài
    // (Đã chuyển vào ItemMenu)

    // --- Action Handlers ---

    // Tạo mới (User Story #1, #36)
    const handleCreateNew = useCallback(async () => {
        // Gửi event, DashboardPage sẽ xử lý
        window.dispatchEvent(new CustomEvent("mm:create"));
    }, []);

    // Đổi tên (User Story #1)
    const handleRename = useCallback(async (id: string, newName: string) => {
        const originalItems = items;
        const optimisticUpdate = (updatedAt: string) => updateItemName(id, newName, updatedAt);
        optimisticUpdate(new Date().toISOString()); // Optimistic
        
        try {
            if (id.startsWith('guest-')) {
                updateGuest(id, newName); // Local logic
            } else if (isAuthed) {
                const updatedMap = await mindmapsApi.updateName(id, newName);
                updateItemName(id, updatedMap.name, updatedMap.updatedAt); // Corrected data
            }
            addToast("Đã đổi tên mindmap!", "success");
        } catch (error) {
            console.error("Rename failed:", error);
            addToast("Đổi tên thất bại!", "error");
            setItems(originalItems); // Revert
        }
    }, [items, isAuthed, updateItemName, setItems, updateGuest, addToast]);

    // Mở Modal Xóa (User Story #3)
    const openDeleteModal = useCallback((item: MindmapSummary) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    }, []);

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
                removeGuest(idToDelete); // Local logic
            } else if (isAuthed) {
                await mindmapsApi.delete(idToDelete); // Server logic
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

    // Chia sẻ (User Story #18)
    const handleShare = useCallback((id: string) => {
         // DashboardPage sẽ quản lý Modal Share
         window.dispatchEvent(new CustomEvent("mm:share", { detail: { id } }));
         setActiveMenuId(null);
    }, []);

    // Nhân bản (User Story #5)
    const handleDuplicate = useCallback(async (id: string) => {
        setLoading(true);
        try {
            let newMapData: MindmapSummary;
            if (id.startsWith('guest-')) {
                const guestMaps = listGuests();
                const sourceMap = guestMaps.find(m => m.id === id);
                const sourceDoc = (sourceMap && useLocalMindmap().getGuestDoc(id)); // Lấy doc
                if (sourceMap && sourceDoc) {
                    const newGuest = createGuest(); // Tạo mới hoàn toàn
                    // Cập nhật tên và content
                    const newName = `Bản sao của ${sourceMap.name}`;
                    updateGuest(newGuest.id, newName);
                    // Cập nhật content (phần này phức tạp, cần API)
                    // Tạm thời chỉ tạo mới và đổi tên
                     addToast(`Đã nhân bản "${newName}" (guest)!`, "success");
                     newMapData = { ...newGuest, name: newName };
                } else {
                    throw new Error("Không tìm thấy dữ liệu mindmap gốc.");
                }
            } else if (isAuthed) {
                const duplicatedMap = await mindmapsApi.duplicate(id);
                newMapData = {
                    id: duplicatedMap.id,
                    name: duplicatedMap.name,
                    ownerId: duplicatedMap.ownerId,
                    createdAt: duplicatedMap.createdAt,
                    updatedAt: duplicatedMap.updatedAt,
                    accessSettings: duplicatedMap.accessSettings
                };
                addItem(newMapData); // Thêm vào store
                addToast(`Đã nhân bản "${newMapData.name}"!`, "success");
            }
            setLoading(false);
        } catch (error: any) {
            console.error("Duplicate failed:", error);
            addToast(`Nhân bản thất bại: ${error.message || 'Lỗi không xác định'}`, "error");
            setLoading(false);
        }
    }, [isAuthed, addToast, createGuest, updateGuest, listGuests, addItem, setLoading]);


    return (
        <>
            {/* Overlay trigger (cho desktop, khi chưa pin) */}
            {!isPinned && !isOpen && (
                <div
                    className="fixed top-0 left-0 h-full w-4 z-40"
                    onMouseEnter={() => setIsOpen(true)}
                />
            )}
            
            {/* Nút toggle (cho mobile, hoặc khi đã pin) */}
             <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => !isPinned && setIsOpen(true)}
                className={`fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-md border border-gray-700/50
                    ${isOpen && !isPinned ? 'opacity-0 pointer-events-none' : ''}
                `}
                aria-label="Toggle Sidebar"
            >
                <MoreVertical size={20} />
            </button>
            
            {/* Sidebar Element */}
            <aside
                ref={sidebarRef}
                onMouseEnter={() => !isPinned && setIsOpen(true)}
                className={`fixed top-0 left-0 h-screen bg-gray-900/90 backdrop-blur-lg text-white z-[45] transition-transform duration-300 ease-in-out border-r border-gray-700/50 flex flex-col
                    ${isOpen ? "translate-x-0 w-72 shadow-2xl" : "-translate-x-full w-72"}
                `}
                aria-hidden={!isOpen}
            >
                {/* Header */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700/50 flex-shrink-0" style={{ paddingLeft: 'calc(0.75rem + 36px + 0.75rem)' }}>
                    <span className="font-semibold text-lg truncate">Mindmaps</span>
                    <button
                        onClick={() => setIsPinned(!isPinned)}
                        className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title={isPinned ? "Bỏ ghim" : "Ghim sidebar"}
                    >
                        {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                    </button>
                </div>

                {/* Actions: New & Search */}
                <div className="px-4 py-3 space-y-3 border-b border-gray-700/50">
                    <Button
                        onClick={handleCreateNew}
                        disabled={loading}
                        className="w-full justify-center gap-2 !py-2.5"
                    >
                        {loading && !items.length ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18} />}
                        Tạo mindmap mới
                    </Button>
                    <div className="relative">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-800 rounded-md py-2 pl-9 pr-3 text-sm outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-gray-700/50 border border-transparent focus:border-blue-600 transition-colors"
                            placeholder="Tìm kiếm... (Ctrl+F)"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* Mindmap List */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="text-xs text-gray-400 px-2 mb-1 font-medium uppercase tracking-wider">Gần đây</div>
                    {loading && items.length === 0 ? (
                        <div className="text-center text-gray-500 py-6 text-sm flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải...</div>
                    ) : sortedItems.length === 0 ? (
                        <div className="text-center text-gray-500 py-6 text-sm px-4">{searchQuery ? 'Không tìm thấy kết quả.' : 'Chưa có mindmap nào.'}</div>
                    ) : (
                        sortedItems.map((item) => (
                            <div key={item.id} className="group relative">
                                <Link
                                    to={`/editor/${item.id}`}
                                    className={`block w-full text-left p-2.5 rounded-md transition-colors
                                        ${window.location.pathname.includes(item.id) ? 'bg-blue-600/30' : 'hover:bg-gray-800/80'}
                                    `}
                                    onClick={() => !isPinned && setIsOpen(false)} // Auto-close on nav
                                >
                                    <div className="text-sm text-white font-medium truncate" title={item.name}>{item.name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Cập nhật: {formatRelativeDate(item.updatedAt)}
                                    </div>
                                </Link>
                                <button
                                    onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                    className="absolute top-1/2 right-1.5 transform -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label={`Tùy chọn cho ${item.name}`}
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {activeMenuId === item.id && (
                                    <ItemMenu
                                        item={item}
                                        onRename={handleRename}
                                        onDelete={() => openDeleteModal(item)}
                                        onShare={handleShare}
                                        onDuplicate={handleDuplicate}
                                        onClose={() => setActiveMenuId(null)}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                 <div className="px-2 py-2 border-t border-gray-700/50 space-y-1">
                     <button onClick={() => addToast("Chức năng Cài đặt đang phát triển.", "info")} className="w-full text-left p-2.5 rounded-md hover:bg-gray-800/80 transition-colors text-sm text-gray-300 flex items-center gap-2">
                         <Settings size={16} /> Cài đặt
                     </button>
                     <button onClick={() => addToast("Chức năng Trợ giúp đang phát triển.", "info")} className="w-full text-left p-2.5 rounded-md hover:bg-gray-800/80 transition-colors text-sm text-gray-300 flex items-center gap-2">
                         <HelpCircle size={16} /> Trợ giúp
                     </button>
                     {isAuthed && (
                         <button onClick={logout} className="w-full text-left p-2.5 rounded-md hover:bg-red-800/30 transition-colors text-sm text-red-400 flex items-center gap-2">
                             <LogOut size={16} /> Đăng xuất
                         </button>
                     )}
                 </div>
            </aside>
            
            {/* Delete Confirmation Modal */}
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
        </>
    );
};

export default Sidebar;
