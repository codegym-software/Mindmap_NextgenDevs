/**
 * src/api/mindmapsApi.ts
 * 
 * LỚP GIAO TIẾP API CHO MINDMAP
 * 
 * Đã được cập nhật đầy đủ:
 * - Các hàm CRUD cơ bản (list, get, create, update, delete...)
 * - Hỗ trợ global settings (font, branch color, background...)
 * - [MỚI] Tính năng Collaboration & Share (mời người, phân quyền, public link)
 */

import api from './api';

// === IMPORT CÁC TYPE & HÀM CHUYỂN ĐỔI DỮ LIỆU ===
import {
  BeMindmapDoc,
  BeMindmapContent,
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
  migrateOldGuestDataToBE,
} from './dataMapper';

import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
} from '../app/store/useEditorStore';

// === [MỚI] TYPES CHO TÍNH NĂNG COLLABORATION & SHARE ===
export type Permission = 'OWNER' | 'EDITOR' | 'VIEWER';

export type Collaborator = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  permission: Permission;
};

export type ShareSettingsResponse = {
  mindmapId: string;
  isPublic: boolean;
  publicAccessLevel: 'VIEW' | 'DISABLED';
  shareLink: string | null;
};

// === CẤU TRÚC DỮ LIỆU TRẢ VỀ CHO FRONTEND (phẳng, dễ dùng trong Editor) ===
export type FeMindmapDoc = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  // Nội dung canvas đã được "làm phẳng"
  nodes: FeNodeData[];
  edges: FeEdgeData[];
  layoutMode: string;
  theme: string;

  // Global settings (từ backend)
  fontFamily?: string;
  branchLineWidth?: number;
  isColoredBranch?: boolean;
  globalBranchColor?: string;
  backgroundColor?: string;
  activeColorThemeId?: string;

    // [MỚI] Bổ sung 2 trường này để Editor.tsx đọc được quyền
  collaborators: Collaborator[];
  accessSettings: {
      isPublic: boolean;
      publicAccessLevel: 'VIEW' | 'DISABLED';
  };
};

// Tóm tắt mindmap (dùng cho danh sách)
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
      accessSettings: (beDoc as any).accessSettings || { isPublic: false, publicAccessLevel: 'DISABLED' },

      ...feContent,
    };
  },

  create: async (payload: {
    name: string;
    content: { nodes: FeNodeData[]; edges: FeEdgeData[] };
  }) => {
    const beContent = normalizeContentFEtoBE(payload.content.nodes, payload.content.edges);
    const response = await api.post<BeMindmapDoc>('/mindmaps', {
      name: payload.name,
      content: beContent,
    });
    return response.data;
  },

  update: async (
    id: string,
    payload: { name: string; content: { nodes: FeNodeData[]; edges: FeEdgeData[] } }
  ) => {
    const beContent = normalizeContentFEtoBE(
      payload.content.nodes || [],
      payload.content.edges || []
    );
    const response = await api.put<BeMindmapDoc>(`/mindmaps/${id}`, {
      name: payload.name,
      content: beContent,
    });
    return response.data;
  },

  remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== 2. ALIASES & TIỆN ÍCH =====
  updateName: async (id: string, name: string) =>
    (await api.put<BeMindmapDoc>(`/mindmaps/${id}`, { name })).data,

  delete: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  syncGuest: async (migratedDocs: BeMindmapDoc[]) =>
    (await api.post<MindmapSummaryDto[]>('/mindmaps/sync', migratedDocs)).data,

  createAndOpen: async () => {
    const feRootNode: FeNodeData = {
      id: 'root',
      nodeText: 'Chủ đề chính',
      x: 0,
      y: 0,
      shape: 'roundedRect',
      color: '#FFFFFF',
      textColor: '#4A5568',
      borderColor: '#CBD5E0',
      borderWidth: 2,
      borderStyle: 'solid',
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      textCase: 'normal',
      nodeLength: 'fit',
      localStructure: 'default',
      branchLineStyle: 'bezier',
      branchLineEnd: 'none',
      branchLineThickness: 'normal',
      quickStyleId: 'default',
    };

    return mindmapsApi.create({
      name: 'Mindmap mới',
      content: { nodes: [feRootNode], edges: [] },
    });
  },

  // ===== 3. [MỚI] COLLABORATION & SHARE API =====
  /**
   * Lấy danh sách người đang có quyền truy cập mindmap
   */
  getCollaborators: async (mindmapId: string): Promise<Collaborator[]> => {
    return (await api.get<Collaborator[]>(`/mindmaps/${mindmapId}/collaborators`)).data;
  },

  /**
   * Mời cộng tác viên mới qua email
   */
  inviteCollaborator: async (
    mindmapId: string,
    email: string,
    permission: Permission
  ): Promise<Collaborator> => {
    return (await api.post<Collaborator>(`/mindmaps/${mindmapId}/collaborators`, {
      email,
      permission,
    })).data;
  },

  /**
   * Thay đổi quyền của một người (Editor ↔ Viewer)
   */
  updateCollaboratorPermission: async (
    mindmapId: string,
    userId: string,
    permission: Permission
  ): Promise<Collaborator> => {
    return (await api.put<Collaborator>(
      `/mindmaps/${mindmapId}/collaborators/${userId}`,
      { permission }
    )).data;
  },

  /**
   * Xóa một người khỏi danh sách cộng tác viên
   */
  removeCollaborator: async (mindmapId: string, userId: string): Promise<void> => {
    return (await api.delete<void>(`/mindmaps/${mindmapId}/collaborators/${userId}`)).data;
  },

  /**
   * Bật/tắt chia sẻ công khai + cấp quyền xem công khai
   */
  updateShareSettings: async (
    mindmapId: string,
    isPublic: boolean,
    publicAccessLevel: 'VIEW' | 'DISABLED'
  ): Promise<ShareSettingsResponse> => {
    return (
      await api.put<ShareSettingsResponse>(`/mindmaps/${mindmapId}/share-settings`, {
        isPublic,
        publicAccessLevel,
      })
    ).data;
  },
  
    requestAccess: async (mindmapId: string): Promise<void> => {
    // Giả định BE có endpoint này. Nếu chưa có, bạn cần bảo BE thêm vào.
    // Logic BE: Gửi noti hoặc email cho Owner.
    return (await api.post<void>(`/mindmaps/${mindmapId}/request-access`)).data;
  },
};