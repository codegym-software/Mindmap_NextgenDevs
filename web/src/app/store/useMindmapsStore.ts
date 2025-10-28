import { create } from "zustand";

// SỬA LỖI (Vấn đề 1 & 3):
// Cập nhật MindmapItem để chứa nhiều thông tin hơn cho Dashboard
// (Khớp với MindmapSummaryDto)
export type MindmapItem = {
    id: string;
    name: string;
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
    ownerId: string;
    // accessSettings?: any; // Có thể thêm nếu Dashboard cần
};

type State = {
    items: MindmapItem[];
    loading: boolean;
    error?: string;
    set: (p: Partial<State>) => void;
};

export const useMindmapsStore = create<State>((set) => ({
    items: [],
    loading: false,
    error: undefined,
    set: (p) => set(p),
}));
