/**
 * Zustand store cho danh sách mindmaps (Dashboard).
 * Tái cấu trúc từ `app/store/useMindmapsStore.ts` cũ.
 * Đã cập nhật kiểu `MindmapSummary` và thêm actions đầy đủ.
 */
import { create } from "zustand";
import { immer } from 'zustand/middleware/immer';

// --- Types ---

// Kiểu dữ liệu tóm tắt mindmap (khớp với BE DTO và Guest item)
export type MindmapSummary = {
    id: string;
    name: string;
    ownerId: string;
    updatedAt: string; // ISO String
    createdAt: string; // ISO String
    tags?: string[];
    accessSettings: { 
        isPublic: boolean; 
        publicAccessLevel: 'VIEW' | 'DISABLED' | 'EDITOR'; 
    };
};

type State = {
    items: MindmapSummary[];
    loading: boolean;
    error: string | null;
};

type Actions = {
    setItems: (items: MindmapSummary[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    // Actions cho optimistic updates (User Story #1, #2, #5)
    addItem: (item: MindmapSummary) => void;
    updateItemName: (id: string, newName: string, newUpdatedAt: string) => void;
    removeItem: (id: string) => void;
};

// --- Store ---
export const useMindmapsStore = create<State & Actions>()(
    immer((set) => ({
        // State
        items: [],
        loading: false,
        error: null,

        // Actions
        setItems: (items) => set(state => {
            state.items = items;
            state.loading = false;
            state.error = null;
        }),

        setLoading: (loading) => set(state => {
            state.loading = loading;
        }),

        setError: (error) => set(state => {
            state.error = error;
            state.loading = false;
        }),

        addItem: (item) => set(state => {
            // Thêm vào đầu danh sách
            state.items.unshift(item);
        }),

        updateItemName: (id, newName, newUpdatedAt) => set(state => {
            const item = state.items.find(item => item.id === id);
            if (item) {
                item.name = newName;
                item.updatedAt = newUpdatedAt;
            }
        }),

        removeItem: (id) => set(state => {
            state.items = state.items.filter(item => item.id !== id);
        }),
    }))
);
