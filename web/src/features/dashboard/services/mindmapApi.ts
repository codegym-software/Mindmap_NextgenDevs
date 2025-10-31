/**
 * API client cho Dashboard.
 * Tái cấu trúc từ `services/mindmapApi.ts` cũ và GĐ2.
 * Thêm `syncGuest` (Endpoint #25).
 */
import api from '../../../lib/axios';
import { MindmapSummary, MindmapDetailResponse, MindmapContent } from '../../../core/types';

// --- Types ---

// Payload cho POST /api/mindmaps
type MindmapCreatePayload = {
    name: string;
    content?: MindmapContent; // Optional, BE sẽ tạo default
};

// Payload cho POST /api/mindmaps/sync
// (Endpoint này không có trong 25, nhưng có trong code cũ 'syncGuest')
// Giả sử Endpoint #25 (POST /api/auth/guest) là endpoint sync
// CHỈNH SỬA: Dùng Endpoint #25 (POST /api/auth/guest) như mô tả.
type GuestSyncPayload = {
    name: string;
    content: MindmapContent;
    createdAt: string; // ISO string
};

// Response từ sync
type GuestSyncResponse = {
    createdMaps: MindmapSummary[]; // Trả về các map đã tạo
};


// --- API Client ---
export const mindmapsApi = {
    
    /**
     * Lấy danh sách mindmap (summary)
     * Endpoint #1: GET /api/mindmaps
     */
    list: async (): Promise<MindmapSummary[]> => {
        const response = await api.get<MindmapSummary[]>('/mindmaps');
        return response.data;
    },

    /**
     * Tạo mindmap mới
     * Endpoint #2: POST /api/mindmaps
     */
    create: async (payload: MindmapCreatePayload): Promise<MindmapDetailResponse> => {
        // Endpoint #2 trả về DetailResponse (để redirect tới editor)
        const response = await api.post<MindmapDetailResponse>('/mindmaps', payload);
        return response.data;
    },

    /**
     * Cập nhật tên mindmap
     * Endpoint #4: PUT /api/mindmaps/{id}
     */
    updateName: async (id: string, name: string): Promise<MindmapDetailResponse> => {
        const response = await api.put<MindmapDetailResponse>(`/mindmaps/${id}`, { name });
        return response.data;
    },

    /**
     * Xóa mindmap
     * Endpoint #5: DELETE /api/mindmaps/{id}
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/mindmaps/${id}`);
    },

    /**
     * Nhân bản mindmap
     * Endpoint #6: POST /api/mindmaps/{id}/duplicate
     */
    duplicate: async (id: string): Promise<MindmapDetailResponse> => {
        // Endpoint #6 trả về DetailResponse (để redirect tới editor)
        const response = await api.post<MindmapDetailResponse>(`/mindmaps/${id}/duplicate`);
        return response.data;
    },

    /**
     * Đồng bộ mindmaps của Guest lên server sau khi đăng nhập.
     * Endpoint #25: POST /api/auth/guest (Giả định)
     */
    syncGuest: async (items: GuestSyncPayload[]): Promise<GuestSyncResponse> => {
        console.warn("syncGuest: Đang sử dụng endpoint giả định /api/auth/guest (Endpoint #25)");
        const response = await api.post<GuestSyncResponse>('/auth/guest', items);
        return response.data;
    },
};
