/**
 * LỚP GIAO TIẾP API (Giai đoạn 6: Tối ưu List/Map)
 *
 * Tệp này đã được "dạy" để sử dụng Data Mapper.
 * - Khi NHẬN (GET), nó dịch dữ liệu BE (lồng) sang FE (phẳng).
 * - Khi GỬI (POST/PUT), nó dịch dữ liệu FE (phẳng) sang BE (lồng).
 *
 * [CẬP NHẬT GĐ 6]: Hàm `update` đã được sửa để chấp nhận `nodes`
 * là một Mảng (List) thay vì Map, loại bỏ chuyển đổi
 * `Object.values()` không cần thiết.
 */

import api from './api';

// === CÁC IMPORT (GĐ 1-4) ===
import {
  // Types (Giao diện) của Backend
  BeMindmapDoc,
  BeMindmapContent,

  // Hàm "Phiên dịch"
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
  migrateOldGuestDataToBE, // Import từ GĐ 4
} from './dataMapper';
import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
} from '../app/store/useEditorStore';
// === KẾT THÚC IMPORT ===

/**
 * [KHÔNG ĐỔI] Định nghĩa cấu trúc dữ liệu phẳng
 * mà `Editor.tsx` mong đợi nhận được từ hàm `get()`.
 */
export type FeMindmapDoc = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  // ... (các trường metadata khác từ BeMindmapDoc nếu cần) ...

  // === Nội dung đã được "làm phẳng" ===
  nodes: FeNodeData[];
  edges: FeEdgeData[];
  layoutMode: string;
  theme: string;
};

/**
 * [KHÔNG ĐỔI] Định nghĩa cấu trúc tóm tắt
 * mà `Dashboard.tsx` / `Sidebar.tsx` mong đợi từ `list()`.
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
   * [KHÔNG ĐỔI] Lấy danh sách tóm tắt.
   */
  list: async () => (await api.get<MindmapSummaryDto[]>('/mindmaps')).data,

  /**
   * [KHÔNG ĐỔI] Lấy chi tiết 1 mindmap.
   */
  get: async (id: string): Promise<FeMindmapDoc> => {
    // 1. Gọi API và nhận về dữ liệu chuẩn BE (lồng)
    const response = await api.get<BeMindmapDoc>(`/mindmaps/${id}`);
    const beDoc = response.data;

    // 2. "Dịch" trường 'content' từ BE sang FE
    const feContent = normalizeContentBEtoFE(beDoc.content);

    // 3. Trả về một object "phẳng" mà Editor.tsx mong đợi
    return {
      id: beDoc.id,
      name: beDoc.name,
      ownerId: beDoc.ownerId,
      createdAt: beDoc.createdAt,
      updatedAt: beDoc.updatedAt,
      version: beDoc.version,

      // Gán content đã được dịch và làm phẳng
      nodes: feContent.nodes,
      edges: feContent.edges,
      layoutMode: feContent.layoutMode,
      theme: feContent.theme,
    };
  },

  /**
   * [KHÔNG ĐỔI] Tạo mới 1 mindmap.
   */
  create: async (payload: {
    name: string;
    content: { nodes: FeNodeData[]; edges: FeEdgeData[] }; // Nhận List FE
  }) => {
    // 1. "Dịch" content FE sang BE (lồng)
    const beContent = normalizeContentFEtoBE(
      payload.content.nodes,
      payload.content.edges,
      { layoutMode: 'mindmap', theme: 'light' }
    );

    // 2. Gửi payload đã chuẩn hóa BE
    const response = await api.post<BeMindmapDoc>('/mindmaps', {
      name: payload.name,
      content: beContent,
    });

    return response.data; // Trả về BeMindmapDoc
  },

  /**
   * [ĐÃ CẬP NHẬT GĐ 6] Cập nhật 1 mindmap (dùng cho Auto-Save).
   * Dịch FE (phẳng, List) -> BE (lồng, List).
   */
  update: async (
    id: string,
    // [FIX GĐ 6] Signature đã đổi
    // Chấp nhận `nodes` là một Mảng (List) thay vì Map
    payload: {
      name: string;
      content: { nodes: FeNodeData[]; edges: FeEdgeData[] };
    }
  ) => {
    // 1. [FIX GĐ 6] Không cần `Object.values` nữa.
    // Lấy thẳng Mảng (List) từ payload.
    const feNodes: FeNodeData[] = payload.content.nodes || [];
    const feEdges: FeEdgeData[] = payload.content.edges || [];

    // 2. "Dịch" content FE (List) sang BE (List lồng)
    const beContent = normalizeContentFEtoBE(feNodes, feEdges);

    // 3. Gửi payload đã chuẩn hóa BE (chỉ 'name' và 'content')
    const response = await api.put<BeMindmapDoc>(`/mindmaps/${id}`, {
      name: payload.name,
      content: beContent,
    });

    return response.data; // Trả về BeMindmapDoc
  },

  /**
   * [KHÔNG ĐỔI] Xóa 1 mindmap.
   */
  remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== Aliases (Các hàm tiện ích) =====

  /**
   * [KHÔNG ĐỔI] Cập nhật tên (Dùng cho Sidebar).
   */
  updateName: async (id: string, name: string) =>
    (await api.put<BeMindmapDoc>(`/mindmaps/${id}`, { name })).data,

  /**
   * [KHÔNG ĐỔI] Alias cho `remove`.
   */
  delete: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== Guest → Server Sync =====

  /**
   * [KHÔNG ĐỔI] Đồng bộ Guest (GĐ 4).
   */
  syncGuest: async (migratedDocs: BeMindmapDoc[]) =>
    (await api.post<MindmapSummaryDto[]>('/mindmaps/sync', migratedDocs)).data,

  /**
   * [KHÔNG ĐỔI] Tạo và Mở (GĐ 2).
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