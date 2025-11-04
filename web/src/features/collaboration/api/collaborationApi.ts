/**
 * API client cho Collaboration.
 * Triển khai Endpoint #8, #9, #10, #11, #12.
 */
import api from '../../../lib/axios';
import { MindmapSummary, MindmapDetailResponse } from '../../../core/types';

type Collaborator = NonNullable<MindmapDetailResponse['collaborators']>[0];
type AccessSettingsPayload = MindmapSummary['accessSettings'];
type InvitePayload = { email: string; permission: 'EDITOR' | 'VIEWER' };

export const collaborationApi = {
    list: async (mindmapId: string): Promise<Collaborator[]> => {
        const { data } = await api.get<Collaborator[]>(`/mindmaps/${mindmapId}/collaborators`);
        return data;
    },

    invite: async (mindmapId: string, payload: InvitePayload): Promise<Collaborator> => {
        const { data } = await api.post<Collaborator>(`/mindmaps/${mindmapId}/collaborators`, payload);
        return data;
    },

    updatePermission: async (mindmapId: string, userId: string, permission: 'EDITOR' | 'VIEWER'): Promise<Collaborator> => {
        const { data } = await api.put<Collaborator>(`/mindmaps/${mindmapId}/collaborators/${userId}`, { permission });
        return data;
    },

    remove: async (mindmapId: string, userId: string): Promise<void> => {
        await api.delete(`/mindmaps/${mindmapId}/collaborators/${userId}`);
    },

    updateShareSettings: async (mindmapId: string, settings: AccessSettingsPayload): Promise<AccessSettingsPayload> => {
        const { data } = await api.put<AccessSettingsPayload>(`/mindmaps/${mindmapId}/share-settings`, settings);
        return data;
    }
};