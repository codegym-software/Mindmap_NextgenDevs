/**
 * LỚP GIAO TIẾP API
 *
 * [CẬP NHẬT]
 * - Cập nhật `FeMindmapDoc` để bao gồm các trường cài đặt global
 * (được trả về từ `normalizeContentBEtoFE`).
 */

import api from './api';

// === CÁC IMPORT ===
import {
  // Types (Giao diện) của Backend
  BeMindmapDoc,
  BeMindmapContent,

  // Hàm "Phiên dịch"
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
  migrateOldGuestDataToBE, 
} from './dataMapper';
import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
} from '../app/store/useEditorStore';
// === KẾT THÚC IMPORT ===

/**
 * [CẬP NHẬT] Định nghĩa cấu trúc dữ liệu phẳng
 * mà `Editor.tsx` mong đợi nhận được từ hàm `get()`.
 */
export type FeMindmapDoc = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  // === Nội dung đã được "làm phẳng" ===
  nodes: FeNodeData[];
  edges: FeEdgeData[];
  layoutMode: string;
  theme: string;
  
  // [MỚI] Thêm các trường cài đặt global
  fontFamily?: string;
  branchLineWidth?: number;
  isColoredBranch?: boolean;
  globalBranchColor?: string;
  backgroundColor?: string;
  activeColorThemeId?: string;
};

/**
 * Định nghĩa cấu trúc tóm tắt
 */
export type MindmapSummaryDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
};

// =========================================================================
// mindmapsApi
// =========================================================================
export const mindmapsApi = {
  // ===== Core CRUD =====

  /**
   * Lấy danh sách tóm tắt.
   */
  list: async () => (await api.get<MindmapSummaryDto[]>('/mindmaps')).data,

  /**
   * [CẬP NHẬT] Lấy chi tiết 1 mindmap.
   */
  get: async (id: string): Promise<FeMindmapDoc> => {
    // 1. Gọm API và nhận về dữ liệu chuẩn BE (lồng)
    const response = await api.get<BeMindmapDoc>(`/mindmaps/${id}`);
    const beDoc = response.data;

    // 2. "Dịch" trường 'content' từ BE sang FE
    // feContent BÂY GIỜ cũng chứa các cài đặt global đã làm phẳng
    const feContent = normalizeContentBEtoFE(beDoc.content);

    // 3. Trả về một object "phẳng" mà Editor.tsx mong đợi
    return {
      id: beDoc.id,
      name: beDoc.name,
      ownerId: beDoc.ownerId,
      createdAt: beDoc.createdAt,
      updatedAt: beDoc.updatedAt,
      version: beDoc.version,

      // Gán content đã được dịch (bao gồm cả cài đặt global)
      ...feContent, 
    };
  },

  /**
   * Tạo mới 1 mindmap.
   */
  create: async (payload: {
    name: string;
    content: { nodes: FeNodeData[]; edges: FeEdgeData[] }; // Nhận List FE
  }) => {
    // 1. "Dịch" content FE sang BE (lồng)
    // Hàm này BÂY GIỜ tự động lấy cài đặt global từ store
    const beContent = normalizeContentFEtoBE(
      payload.content.nodes,
      payload.content.edges
    );

    // 2. Gửi payload đã chuẩn hóa BE
    const response = await api.post<BeMindmapDoc>('/mindmaps', {
      name: payload.name,
      content: beContent,
    });

    return response.data; // Trả về BeMindmapDoc
  },

  /**
   * Cập nhật 1 mindmap (dùng cho Auto-Save).
   */
  update: async (
    id: string,
    payload: {
      name: string;
      content: { nodes: FeNodeData[]; edges: FeEdgeData[] };
    }
  ) => {
    const feNodes: FeNodeData[] = payload.content.nodes || [];
    const feEdges: FeEdgeData[] = payload.content.edges || [];

    // 2. "Dịch" content FE (List) sang BE (List lồng)
    // Hàm này BÂY GIỜ tự động lấy cài đặt global từ store
    const beContent = normalizeContentFEtoBE(feNodes, feEdges);

    // 3. Gửi payload đã chuẩn hóa BE (chỉ 'name' và 'content')
    const response = await api.put<BeMindmapDoc>(`/mindmaps/${id}`, {
      name: payload.name,
      content: beContent,
    });

    return response.data; // Trả về BeMindmapDoc
  },

  /**
   * Xóa 1 mindmap.
   */
  remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== Aliases (Các hàm tiện ích) =====

  /**
   * Cập nhật tên (Dùng cho Sidebar).
   */
  updateName: async (id: string, name: string) =>
    (await api.put<BeMindmapDoc>(`/mindmaps/${id}`, { name })).data,

  /**
   * Alias cho `remove`.
   */
  delete: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== Guest -> Server Sync =====

  /**
   * Đồng bộ Guest.
   */
  syncGuest: async (migratedDocs: BeMindmapDoc[]) =>
    (await api.post<MindmapSummaryDto[]>('/mindmaps/sync', migratedDocs)).data,

  /**
   * Tạo và Mở.
   */
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
      content: {
        nodes: [feRootNode], // Gửi MẢNG FE
        edges: [],
      },
    });
  },
};