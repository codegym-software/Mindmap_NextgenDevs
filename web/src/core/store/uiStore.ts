/**
 * Zustand store cho UI state toàn cục.
 * (File này trước đó trống)
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type UIState = {
    isSidebarOpen: boolean;
    isStylePanelOpen: boolean;
    isShareModalOpen: boolean;
    isExportModalOpen: boolean;
};

type UIActions = {
    toggleSidebar: (isOpen?: boolean) => void;
    toggleStylePanel: (isOpen?: boolean) => void;
    openShareModal: () => void;
    closeShareModal: () => void;
    openExportModal: () => void;
    closeExportModal: () => void;
};

export const useUIStore = create<UIState & UIActions>()(
    immer((set) => ({
        isSidebarOpen: true,
        isStylePanelOpen: false,
        isShareModalOpen: false,
        isExportModalOpen: false,
        toggleSidebar: (isOpen) => set(state => {
            state.isSidebarOpen = isOpen ?? !state.isSidebarOpen;
        }),
        toggleStylePanel: (isOpen) => set(state => {
            state.isStylePanelOpen = isOpen ?? !state.isStylePanelOpen;
        }),
        openShareModal: () => set(state => { state.isShareModalOpen = true; }),
        closeShareModal: () => set(state => { state.isShareModalOpen = false; }),
        openExportModal: () => set(state => { state.isExportModalOpen = true; }),
        closeExportModal: () => set(state => { state.isExportModalOpen = false; }),
    }))
);