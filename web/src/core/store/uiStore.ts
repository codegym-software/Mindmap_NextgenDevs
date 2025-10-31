/**
 * Zustand store cho UI state toàn cục.
 * (File này trước đó trống)
 *
 * Ví dụ: Quản lý trạng thái mở/đóng của Sidebar (để các component khác biết).
 * (Hiện tại Sidebar tự quản lý, nhưng đây là nơi để đưa nó lên global nếu cần).
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type UIState = {
    isSidebarOpen: boolean;
    isShareModalOpen: boolean;
    // Thêm các state UI khác ở đây...
};

type UIActions = {
    toggleSidebar: () => void;
    openShareModal: () => void;
    closeShareModal: () => void;
};

export const useUIStore = create<UIState & UIActions>()(
    immer((set) => ({
        // State
        isSidebarOpen: true,
        isShareModalOpen: false,

        // Actions
        toggleSidebar: () => set(state => {
            state.isSidebarOpen = !state.isSidebarOpen;
        }),
        
        openShareModal: () => set(state => {
            state.isShareModalOpen = true;
        }),
        
        closeShareModal: () => set(state => {
            state.isShareModalOpen = false;
        }),
    }))
);
