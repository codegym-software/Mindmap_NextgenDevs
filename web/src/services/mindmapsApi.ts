/**
 * src/services/mindmapsApi.ts
 *
 * LỚP GIAO TIẾP API CHO MINDMAP
 * Đã cập nhật: Loại bỏ Firebase, dùng API Backend hoàn toàn.
 */

import api from './api';

import {
  BeMindmapDoc,
  BeMindmapContent,
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
} from './dataMapper';

import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
} from '../app/store/useEditorStore';

// === TYPES CHO TÍNH NĂNG COLLABORATION & SHARE ===
export type Permission = 'OWNER' | 'EDITOR' | 'VIEWER';
export type PublicAccessLevel = 'DISABLED' | 'VIEW' | 'EDIT';

export type Collaborator = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  permission: Permission;
};

export type ShareSettingsResponse = {
  mindmapId: string;
  isPublic: boolean;
  publicAccessLevel: PublicAccessLevel;
  shareLink: string | null;
};

// [MỚI] Type cho Access Request từ MongoDB
export type AccessRequestDto = {
  id: string; // Request ID
  mindmapId: string;
  userId: string;
  requestedPermission: Permission;
  requesterEmail: string;
  requesterName: string;
  requesterAvatar: string;
  createdAt: string; // ISO String
};

// === CẤU TRÚC DỮ LIỆU TRẢ VỀ CHO FRONTEND ===
export type FeMindmapDoc = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  nodes: FeNodeData[];
  edges: FeEdgeData[];
  layoutMode: string;
  theme: string;

  fontFamily?: string;
  branchLineWidth?: number;
  isColoredBranch?: boolean;
  globalBranchColor?: string;
  backgroundColor?: string;
  activeColorThemeId?: string;
  
  // [MỚI] Thêm relationships và summaries
  relationships?: any[];
  summaries?: any[];

  collaborators: Collaborator[];
  accessSettings: {
    isPublic: boolean;
    publicAccessLevel: PublicAccessLevel;
  };
};

export type MindmapSummaryDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
};

// =========================================================================
// mindmapsApi - TẤT CẢ CÁC HÀM API
// =========================================================================
export const mindmapsApi = {
  // ===== 1. CORE CRUD =====
  list: async (): Promise<MindmapSummaryDto[]> =>
    (await api.get<MindmapSummaryDto[]>('/mindmaps')).data,

  get: async (id: string): Promise<FeMindmapDoc> => {
    const response = await api.get<BeMindmapDoc>(`/mindmaps/${id}`);
    const beDoc = response.data;
    const feContent = normalizeContentBEtoFE(beDoc.content);

    return {
      id: beDoc.id,
      name: beDoc.name,
      ownerId: beDoc.ownerId,
      createdAt: beDoc.createdAt,
      updatedAt: beDoc.updatedAt,
      version: beDoc.version,
      collaborators: (beDoc as any).collaborators || [],
      accessSettings: (beDoc as any).accessSettings || {
        isPublic: false,
        publicAccessLevel: 'DISABLED',
      },
      ...feContent,
    };
  },

  create: async (payload: {
    name: string;
    content: { nodes: FeNodeData[]; edges: FeEdgeData[] };
  }) => {
    const beContent = normalizeContentFEtoBE(
      payload.content.nodes,
      payload.content.edges,
    );
    const response = await api.post<BeMindmapDoc>('/mindmaps', {
      name: payload.name,
      content: beContent,
    });
    return response.data;
  },

  update: async (
    id: string,
    payload: {
      name: string;
      content: { 
        nodes: FeNodeData[]; 
        edges: FeEdgeData[];
        relationships?: any[];
        summaries?: any[];
      };
    }
  ) => {
    const feNodes: FeNodeData[] = payload.content.nodes || [];
    const feEdges: FeEdgeData[] = payload.content.edges || [];
    const feRelationships = payload.content.relationships || [];
    const feSummaries = payload.content.summaries || [];

    // 2. "Dịch" content FE (List) sang BE (List lồng)
    // Hàm này BÂY GIỜ tự động lấy cài đặt global từ store
    const beContent = normalizeContentFEtoBE(feNodes, feEdges, feRelationships, feSummaries);

    // 3. Gửi payload đã chuẩn hóa BE (chỉ 'name' và 'content')
    const response = await api.put<BeMindmapDoc>(`/mindmaps/${id}`, {
      name: payload.name,
      content: beContent,
    });
    return response.data;
  },

  remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // Alias delete -> remove
  delete: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  updateName: async (id: string, name: string) =>
    (await api.put<BeMindmapDoc>(`/mindmaps/${id}`, { name })).data,

  syncGuest: async (migratedDocs: BeMindmapDoc[]) =>
    (await api.post<MindmapSummaryDto[]>('/mindmaps/sync', migratedDocs)).data,

  createAndOpen: async () => {
    const feRootNode: FeNodeData = {
      id: 'root',
      nodeText: 'Chủ đề chính',
      x: 0,
      y: 0,
      // Node gốc không set các thuộc tính style để sử dụng theme mặc định
      nodeLength: 'fit',
      quickStyleId: 'default',
    };

    return mindmapsApi.create({
      name: 'Mindmap mới',
      content: { nodes: [feRootNode], edges: [] },
    });
  },

  // ===== 3. COLLABORATION & SHARE API (BE / MONGODB) =====
  getCollaborators: async (mindmapId: string): Promise<Collaborator[]> => {
    return (await api.get<Collaborator[]>(`/mindmaps/${mindmapId}/collaborators`))
      .data;
  },

  inviteCollaborator: async (
    mindmapId: string,
    email: string,
    permission: Permission,
  ): Promise<Collaborator> => {
    return (
      await api.post<Collaborator>(`/mindmaps/${mindmapId}/collaborators`, {
        email,
        permission,
      })
    ).data;
  },

  updateCollaboratorPermission: async (
    mindmapId: string,
    userId: string,
    permission: Permission,
  ): Promise<Collaborator> => {
    return (
      await api.put<Collaborator>(
        `/mindmaps/${mindmapId}/collaborators/${userId}`,
        { permission },
      )
    ).data;
  },

  removeCollaborator: async (mindmapId: string, userId: string): Promise<void> => {
    return (
      await api.delete<void>(`/mindmaps/${mindmapId}/collaborators/${userId}`)
    ).data;
  },

  updateShareSettings: async (
    mindmapId: string,
    payload: { isPublic: boolean; publicAccessLevel: PublicAccessLevel },
  ): Promise<ShareSettingsResponse> => {
    return (
      await api.put<ShareSettingsResponse>(
        `/mindmaps/${mindmapId}/share-settings`,
        payload,
      )
    ).data;
  },

  // --- Request / Approve / Reject (BE - MongoDB queue) ---

  requestAccess: async (
    mindmapId: string,
    requestedPermission: Permission = 'VIEWER',
  ): Promise<void> => {
    await api.post<void>(`/mindmaps/${mindmapId}/request-access`, {
      requestedPermission,
    });
  },

  approveAccessRequest: async (
    mindmapId: string,
    userId: string,
    permission: Permission,
  ) => {
    return api.post(`/mindmaps/${mindmapId}/requests/${userId}/approve`, {
      permission,
    });
  },

  rejectAccessRequest: async (mindmapId: string, userId: string) => {
    return api.post(`/mindmaps/${mindmapId}/requests/${userId}/reject`);
  },

  // [MỚI] Lấy danh sách yêu cầu đang chờ (Owner)
  getPendingRequests: async (mindmapId: string): Promise<AccessRequestDto[]> => {
    return (await api.get<AccessRequestDto[]>(`/mindmaps/${mindmapId}/requests`))
      .data;
  },
};