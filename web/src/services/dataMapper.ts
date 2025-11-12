/**
 * LỚP PHIÊN DỊCH DỮ LIỆU (DATA MAPPER)
 *
 * Tệp này là "bộ não" trung gian, chịu trách nhiệm "dịch" cấu trúc dữ liệu
 * giữa Frontend (FE) và Backend (BE) mà không làm thay đổi logic nghiệp vụ
 * hay giao diện người dùng.
 *
 * - FE (useEditorStore): Lưu trữ NodeData "phẳng" (flat structure), ví dụ: { id, nodeText, color, shape, ... }
 * - BE (API/Database):   Lưu trữ NodeData "lồng" (nested structure), ví dụ: { id, text, style: { backgroundColor, shape, ... } }
 *
 * Tệp này cũng xử lý việc chuyển đổi FE (Map) -> BE (List) theo sơ đồ Hyprid.
 *
 * [GĐ 4] Bổ sung logic Di cư (Migration) cho dữ liệu Guest cũ.
 */

// 1. IMPORT TYPES CỦA FRONTEND
import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
} from '../app/store/useEditorStore';

// =================================================================================
// 2. ĐỊNH NGHĨA TYPES (INTERFACE) CỦA BACKEND
// =================================================================================

export type BeNodeStyle = {
  // [FIX] Cập nhật: Dựa trên NodeStyle.java, các trường này
  // không khớp với dataMapper Giai đoạn 1.
  // Các trường đúng là: color, font, isBold, isItalic, textAlign.
  color: string;
  font: string;
  isBold: boolean;
  isItalic: boolean;
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';

  // [FIX] Các trường FE sau đây KHÔNG HỀ TỒN TẠI trên BeNodeStyle.java
  // Chúng phải được lồng vào NodeData.java (nếu cần) hoặc
  // chúng ta phải sửa NodeStyle.java
  //
  // DỰA TRÊN CODE BE HIỆN TẠI, CÁC TRƯỜNG NÀY SẼ BỊ MẤT KHI LƯU:
  // shape: 'rectangle' | 'roundedRect' | 'diamond' | 'ellipse';
  // backgroundColor: string;
  // textColor: string;
  // borderStyle: 'solid' | 'dashed' | 'dotted';
  // fontWeight: 'normal' | 'bold';
  // fontStyle: 'normal' | 'italic';
  // borderColor?: string;
  // ... (và tất cả các trường khác)

  // ==> TẠM THỜI, chúng ta sẽ DỊCH NGƯỢC LẠI
  // theo đúng `NodeStyle.java` của BE
};

export type BeNodeData = {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  collapsed: boolean;
  style: Partial<BeNodeStyle>; // Object style lồng nhau
  side?: 'left' | 'right';
  hyperlink?: string | null;
  notes?: string | null;
  externalReference?: any | null;

  // [FIX] CÁC TRƯỜNG STYLE "PHẲNG" KHÔNG CÓ TRÊN BE NodeData.java
  // Chúng ta phải giả định rằng dataMapper Giai đoạn 1 đã sai
  // và `NodeData.java` KHÔNG chứa các trường này.
};

export type BeEdgeData = {
  id: string;
  from: string;
  to: string;
  style?: any;
};

export type BeMindmapContent = {
  layoutMode: string;
  theme: string; // "light" | "dark"
  nodes: BeNodeData[];
  edges: BeEdgeData[];
};

export type BeMindmapDoc = {
  id: string;
  name: string;
  ownerId: string;
  content: BeMindmapContent;
  accessSettings: {
    isPublic: boolean;
    publicAccessLevel: 'DISABLED' | 'VIEW';
  };
  workspaceId?: string | null;
  tags: string[];
  lastEditedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isMigratedGuestMap?: boolean;
};

// =================================================================================
// 3. VIẾT HÀM PHIÊN DỊCH (NORMALIZATION)
// =================================================================================

/**
 * [ĐÃ CẬP NHẬT] Dịch 1 Node: Frontend (phẳng) -> Backend (lồng style)
 *
 * Dựa trên cấu trúc `NodeStyle.java` thực tế, chúng ta chỉ có thể
 * lưu 5 trường style. Các trường khác sẽ bị mất.
 */
export function normalizeNodeFEtoBE(feNode: FeNodeData): BeNodeData {
  const {
    id,
    nodeText,
    x,
    y,
    parentId,
    collapsed,
    side,

    // Các trường style của FE
    color,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
    
    // ... các trường FE khác (shape, borderColor, ...) sẽ BỊ MẤT
    // vì BE `NodeStyle.java` không có chỗ chứa.
  } = feNode;

  // Tạo object 'style' lồng nhau (CHỈ CÁC TRƯỜNG BE HỖ TRỢ)
  const beStyle: Partial<BeNodeStyle> = {
    color: color,
    font: fontFamily,
    isBold: fontWeight === 'bold',
    isItalic: fontStyle === 'italic',
    // Ánh xạ giá trị enum (FE 'center' -> BE 'CENTER')
    textAlign: (textAlign?.toUpperCase() || 'CENTER') as BeNodeStyle['textAlign'],
  };

  const beNode: BeNodeData = {
    id,
    text: nodeText,
    x,
    y,
    parentId: parentId || null,
    collapsed: collapsed || false,
    side: side,
    style: beStyle,
  };

  return beNode;
}

/**
 * [ĐÃ CẬP NHẬT] Dịch 1 Node: Backend (lồng style) -> Frontend (phẳng)
 *
 * [FIX 4] Thêm kiểm tra 'style' null (null-safe).
 */
export function normalizeNodeBEtoFE(beNode: BeNodeData): FeNodeData {
  const { id, text, x, y, parentId, collapsed, side, style } = beNode;

  // [FIX] Thêm 'safeStyle' để xử lý 'style' bị null
  // (VD: từ dữ liệu cũ hoặc từ createDefaultContent() trước khi fix)
  const safeStyle = style || {};

  const feNode: FeNodeData = {
    id,
    nodeText: text,
    x,
    y,
    parentId: parentId || undefined,
    collapsed: collapsed || false,
    side: side,

    // [FIX] "Làm phẳng" (flatten) object 'style'
    // Dựa trên `NodeStyle.java` thực tế
    color: safeStyle.color,
    fontFamily: safeStyle.font,
    fontWeight: safeStyle.isBold ? 'bold' : 'normal',
    fontStyle: safeStyle.isItalic ? 'italic' : 'normal',
    textAlign: (safeStyle.textAlign?.toLowerCase() || 'center') as FeNodeData['textAlign'],

    // [FIX] Các trường FE này không được BE lưu,
    // nên chúng ta gán giá trị mặc định (lấy từ useEditorStore)
    shape: 'roundedRect',
    borderColor: '#CBD5E0',
    borderWidth: 2,
    borderStyle: 'solid',
    fontSize: 14,
    textDecoration: 'none',
    textColor: '#4A5568', // <-- Lỗi nghiêm trọng: BE không lưu textColor
    textCase: 'normal',
    nodeLength: 'fit', // 'fit' (BE không lưu)
    localStructure: 'default',
    branchColor: undefined,
    branchLineStyle: 'bezier',
    branchLineEnd: 'none',
    branchLineThickness: 'normal',
    quickStyleId: 'default',
  };

  return feNode;
}

// =================================================================================
// 4. VIẾT HÀM PHIÊN DỊCH TOÀN BỘ CONTENT
// =================================================================================

export function normalizeContentFEtoBE(
  feNodes: FeNodeData[],
  feEdges: FeEdgeData[],
  globalSettings: { layoutMode?: string; theme?: string } = {}
): BeMindmapContent {
  // [FIX] Sử dụng hàm normalizeNodeFEtoBE (đã cập nhật)
  const beNodes = feNodes.map(normalizeNodeFEtoBE);

  return {
    layoutMode: globalSettings.layoutMode || 'mindmap',
    theme: globalSettings.theme || 'light',
    nodes: beNodes,
    edges: feEdges.map((edge) => ({ ...edge })),
  };
}

export function normalizeContentBEtoFE(
  beContent: BeMindmapContent | undefined | null
): { nodes: FeNodeData[]; edges: FeEdgeData[]; layoutMode: string; theme: string } {
  if (!beContent || !beContent.nodes || beContent.nodes.length === 0) {
    const rootNode = normalizeNodeBEtoFE({
      id: 'root',
      text: 'Chủ đề chính',
      x: 0,
      y: 0,
      collapsed: false,
      parentId: null,
      side: 'right',
      style: { // [FIX] Gửi style rỗng, để normalizeNodeBEtoFE xử lý
        // (Vì BE NodeData.java đã tự khởi tạo 'new NodeStyle()')
      },
    });
    return {
      nodes: [rootNode],
      edges: [],
      layoutMode: 'mindmap',
      theme: 'light',
    };
  }

  // [FIX] Sử dụng hàm normalizeNodeBEtoFE (đã cập nhật)
  const feNodes = beContent.nodes.map(normalizeNodeBEtoFE);

  return {
    nodes: feNodes,
    edges: beContent.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
    })),
    layoutMode: beContent.layoutMode || 'mindmap',
    theme: beContent.theme || 'light',
  };
}

// =================================================================================
// 5. GUEST DATA MIGRATION (Giai đoạn 4)
// =================================================================================

type OldFeGuestMapItem = {
  id: string;
  name: string;
  createdAt: string;
};
type OldFeGuestDoc = {
  id: string;
  name: string;
  content: {
    nodes: { [key: string]: any };
    edges: FeEdgeData[];
  };
};

export function migrateOldGuestDataToBE(
  guestMapsRaw: string,
  guestDocsRaw: string
): BeMindmapDoc[] {
  let guestList: OldFeGuestMapItem[] = [];
  let guestDocs: { [id: string]: OldFeGuestDoc } = {};

  try {
    guestList = JSON.parse(guestMapsRaw || '[]');
    guestDocs = JSON.parse(guestDocsRaw || '{}');
  } catch (e) {
    console.error('Lỗi parse dữ liệu Guest cũ:', e);
    return [];
  }

  const migratedDocs: BeMindmapDoc[] = [];

  for (const guestItem of guestList) {
    const oldDoc = guestDocs[guestItem.id];
    if (!oldDoc || !oldDoc.content) {
      continue;
    }

    const oldNodesList: any[] = Object.values(oldDoc.content.nodes || {});
    const oldEdgesList: FeEdgeData[] = oldDoc.content.edges || [];

    const beNodes: BeNodeData[] = oldNodesList.map((oldNode) => {
      // 1. Tạo FeNodeData (phẳng) tạm thời
      const tempFeNode: FeNodeData = {
        id: oldNode.id,
        nodeText: oldNode.nodeText ?? oldNode.text ?? '',
        x: oldNode.x || 0,
        y: oldNode.y || 0,
        parentId: oldNode.parentId,
        collapsed: oldNode.collapsed || false,
        side: oldNode.side,
        shape: oldNode.shape,
        color: oldNode.color ?? oldNode.fill,
        borderColor: oldNode.borderColor ?? oldNode.stroke,
        borderWidth: oldNode.borderWidth,
        borderStyle: oldNode.borderStyle,
        fontFamily: oldNode.fontFamily,
        fontSize: oldNode.fontSize,
        fontWeight: oldNode.fontWeight,
        fontStyle: oldNode.fontStyle,
        textDecoration: oldNode.textDecoration,
        textAlign: oldNode.textAlign,
        textColor: oldNode.textColor, // Trường này sẽ bị mất khi dịch
        textCase: oldNode.textCase,
        nodeLength: oldNode.nodeLength,
        localStructure: oldNode.localStructure,
        branchColor: oldNode.branchColor,
        branchLineStyle: oldNode.branchLineStyle,
        branchLineEnd: oldNode.branchLineEnd,
        branchLineThickness: oldNode.branchLineThickness,
        quickStyleId: oldNode.quickStyleId,
      };

      // 2. [FIX] Dịch sang BE (sử dụng logic dịch đã cập nhật)
      return normalizeNodeFEtoBE(tempFeNode);
    });

    const beContent: BeMindmapContent = {
      layoutMode: 'mindmap',
      theme: 'light',
      nodes: beNodes,
      edges: oldEdgesList.map((e) => ({ id: e.id, from: e.from, to: e.to })),
    };

    const beDoc: BeMindmapDoc = {
      id: guestItem.id,
      name: guestItem.name,
      content: beContent,
      createdAt: guestItem.createdAt,
      updatedAt: new Date().toISOString(),
      isMigratedGuestMap: true,
      ownerId: '',
      lastEditedBy: '',
      version: 0,
      tags: [],
      accessSettings: { isPublic: false, publicAccessLevel: 'DISABLED' },
    };

    migratedDocs.push(beDoc);
  }

  return migratedDocs;
}