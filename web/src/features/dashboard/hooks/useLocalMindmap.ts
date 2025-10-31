/**
 * Hook quản lý CRUD cho mindmaps của Guest (Khách).
 * Tuân thủ User Story #36 (Tạo mindmap không login).
 * Tái cấu trúc từ `hooks/useLocalMindmap.ts` cũ.
 *
 * QUAN TRỌNG (Hybrid): Đã sửa để lưu 'content.nodes' dưới dạng LIST [ ]
 * thay vì OBJECT { } để đồng bộ với BE và useEditorStore.
 */
import { useCallback } from "react";
import { useMindmapsStore, MindmapSummary } from "../store/useMindmapsStore";
import { MindmapContent } from "../../../core/types";
import { v4 as uuidv4 } from 'uuid';

// Key cho danh sách mindmaps (Dashboard)
const GUEST_MAPS_KEY = "mindmap_guest_maps_v1";
// Key cho nội dung chi tiết (Editor)
const GUEST_DOCS_KEY = "mindmap_guest_docs_v2"; // v2 sử dụng List<NodeData>

// Định nghĩa kiểu dữ liệu lưu trong localStorage
type GuestMapSummary = MindmapSummary;
type GuestMapDoc = {
    id: string;
    name: string;
    content: MindmapContent;
    version: number; // Thêm version
};

export function useLocalMindmap() {
    const { setItems, addItem, updateItemName: updateStoreName, removeItem: removeStoreItem } = useMindmapsStore();

    /**
     * Tải danh sách mindmaps của Guest từ localStorage vào Zustand store.
     */
    const loadGuestItems = useCallback(() => {
        try {
            const raw = localStorage.getItem(GUEST_MAPS_KEY);
            const arr: GuestMapSummary[] = raw ? JSON.parse(raw) : [];
            setItems(arr);
        } catch (e) {
            console.error("Failed to load guest items:", e);
            setItems([]);
        }
    }, [setItems]);

    /**
     * Lấy danh sách thô (raw) mindmaps của Guest.
     */
    const listGuests = useCallback((): GuestMapSummary[] => {
        try {
            return JSON.parse(localStorage.getItem(GUEST_MAPS_KEY) || "[]");
        } catch {
            return [];
        }
    }, []);

    /**
     * Lấy nội dung chi tiết (doc) của một mindmap Guest.
     */
    const getGuestDoc = useCallback((id: string): GuestMapDoc | null => {
        try {
            const docs = JSON.parse(localStorage.getItem(GUEST_DOCS_KEY) || "{}");
            return docs[id] || null;
        } catch {
            return null;
        }
    }, []);

    /**
     * Tạo một mindmap Guest mới (User Story #36).
     */
    const createGuest = useCallback((): GuestMapSummary => {
        const now = new Date().toISOString();
        const newId = `guest-${uuidv4()}`;
        
        // 1. Tạo item trong danh sách (list)
        const newItem: GuestMapSummary = {
            id: newId,
            name: "Mindmap (Guest)",
            ownerId: "guest",
            createdAt: now,
            updatedAt: now,
            accessSettings: { isPublic: false, publicAccessLevel: 'DISABLED' },
        };
        addItem(newItem); // Cập nhật store
        localStorage.setItem(GUEST_MAPS_KEY, JSON.stringify([newItem, ...listGuests()]));

        // 2. Tạo nội dung (doc) cho editor
        // QUAN TRỌNG: Tuân thủ Hybrid, `nodes` là một List [ ]
        const newDoc: GuestMapDoc = {
            id: newId,
            name: newItem.name,
            version: 1,
            content: {
                nodes: [
                    {
                        id: 'root',
                        text: 'Chủ đề chính',
                        x: 0,
                        y: 0,
                        level: 0,
                        width: 150, // Giá trị mặc định
                        height: 40, // Giá trị mặc định
                        descendantCount: 0,
                    }
                ],
                edges: []
            }
        };
        
        const docs = JSON.parse(localStorage.getItem(GUEST_DOCS_KEY) || "{}");
        docs[newId] = newDoc;
        localStorage.setItem(GUEST_DOCS_KEY, JSON.stringify(docs));

        return newItem;
    }, [addItem, listGuests]);

    /**
     * Cập nhật tên của mindmap Guest (User Story #1).
     */
    const updateGuestName = useCallback((id: string, name: string) => {
        const now = new Date().toISOString();
        
        // 1. Cập nhật danh sách
        const updatedList = listGuests().map(item =>
            item.id === id ? { ...item, name, updatedAt: now } : item
        );
        localStorage.setItem(GUEST_MAPS_KEY, JSON.stringify(updatedList));
        updateStoreName(id, name, now); // Cập nhật store

        // 2. Cập nhật doc
        const doc = getGuestDoc(id);
        if (doc) {
            doc.name = name;
            doc.version = (doc.version || 1) + 1;
            const docs = JSON.parse(localStorage.getItem(GUEST_DOCS_KEY) || "{}");
            docs[id] = doc;
            localStorage.setItem(GUEST_DOCS_KEY, JSON.stringify(docs));
        }
    }, [listGuests, updateStoreName, getGuestDoc]);

    /**
     * Xóa mindmap Guest (User Story #2).
     */
    const removeGuest = useCallback((id: string) => {
        // 1. Xóa khỏi danh sách
        const updatedList = listGuests().filter(item => item.id !== id);
        localStorage.setItem(GUEST_MAPS_KEY, JSON.stringify(updatedList));
        removeStoreItem(id); // Cập nhật store

        // 2. Xóa khỏi doc
        const docs = JSON.parse(localStorage.getItem(GUEST_DOCS_KEY) || "{}");
        delete docs[id];
        localStorage.setItem(GUEST_DOCS_KEY, JSON.stringify(docs));
    }, [listGuests, removeStoreItem]);

    return {
        loadGuestItems,
        listGuests,
        getGuestDoc,
        createGuest,
        updateGuestName,
        removeGuest,
    };
}
