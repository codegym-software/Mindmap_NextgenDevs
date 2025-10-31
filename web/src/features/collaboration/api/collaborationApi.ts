/**
 * API client cho Collaboration (Share Modal).
 * Triển khai các Endpoint #8, #9, #10, #11, #12.
 */
import api from '../../../lib/axios';
import { MindmapSummary, Collaborator } from '../../../core/types';

// --- Types ---
type AccessSettingsPayload = MindmapSummary['accessSettings'];
type InvitePayload = {
    email: string;
    permission: 'EDITOR' | 'VIEWER';
};

// --- API Client ---
export const collaborationApi = {
    
    /**
     * Lấy danh sách collaborators
     * Endpoint #9: GET /api/mindmaps/{id}/collaborators
     */
    list: async (mindmapId: string): Promise<Collaborator[]> => {
        const response = await api.get<Collaborator[]>(`/mindmaps/${mindmapId}/collaborators`);
        return response.data;
    },

    /**
     * Mời collaborator mới
     * Endpoint #10: POST /api/mindmaps/{id}/collaborators
     */
    invite: async (mindmapId: string, payload: InvitePayload): Promise<Collaborator> => {
        const response = await api.post<Collaborator>(`/mindmaps/${mindmapId}/collaborators`, payload);
        return response.data;
    },

    /**
     * Cập nhật quyền của collaborator
     * Endpoint #11: PUT /api/mindmaps/{id}/collaborators/{userId}
     */
    updatePermission: async (mindmapId: string, userId: string, permission: 'EDITOR' | 'VIEWER'): Promise<Collaborator> => {
        const response = await api.put<Collaborator>(`/mindmaps/${mindmapId}/collaborators/${userId}`, { permission });
        return response.data;
    },

    /**
     * Xóa/Thu hồi quyền collaborator
     * Endpoint #12: DELETE /api/mindmaps/{id}/collaborators/{userId}
     */
    remove: async (mindmapId: string, userId: string): Promise<void> => {
        await api.delete(`/mindmaps/${mindmapId}/collaborators/${userId}`);
    },
    
    /**
     * Cập nhật cài đặt chia sẻ công khai
     * Endpoint #8: PUT /api/mindmaps/{id}/share-settings
     */
    updateShareSettings: async (mindmapId: string, settings: AccessSettingsPayload): Promise<AccessSettingsPayload> => {
        const response = await api.put<AccessSettingsPayload>(`/mindmaps/${mindmapId}/share-settings`, settings);
        return response.data;
    }

    // Endpoint #7 (Get Share Link) không cần thiết, link là `.../share/{mindmapId}`
};
