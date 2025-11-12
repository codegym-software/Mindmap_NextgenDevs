/**
 * LỚP PHIÊN DỊCH DỮ LIỆU (DATA MAPPER)
 *
 * [CẬP NHẬT GIAI ĐOẠN B]
 * - Đã thêm `styleLocked` vào `BeNodeStyle`.
 * - Cập nhật các hàm `normalizeNodeFEtoBE` và `normalizeNodeBEtoFE`
 * để "dịch" trường `styleLocked` mới từ `useEditorStore`.
 * - Logic Di cư (Migration) (GĐ 4) vẫn được giữ nguyên.
 */

// 1. IMPORT TYPES CỦA FRONTEND
import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
} from '../app/store/useEditorStore'; // Import từ store đã cập nhật (GĐ B)

// =================================================================================
// 2. ĐỊNH NGHĨA TYPES (INTERFACE) CỦA BACKEND
// =================================================================================

export type BeNodeStyle = {
  // === Các trường BE gốc ===
  shape: 'rectangle' | 'roundedRect'; // Đảm bảo hỗ trợ đầy đủ
  backgroundColor: string; // Tương ứng 'color' của FE
  textColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';

  // === Các trường FE được "lồng" vào đây ===
  borderColor?: string;
  borderWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  nodeLength?: 'fit' | number;
  quickStyleId?: string;
  localStructure?: 'default' | 'logic' | 'org';
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';

  // [MỚI GĐ B] Thêm trường 'styleLocked' từ feature/tt
  styleLocked?: boolean;
};

export type BeNodeData = {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  collapsed: boolean;
  style: Partial<BeNodeStyle>;
  side?: 'left' | 'right';
  hyperlink?: string | null;
  notes?: string | null;
  externalReference?: any | null;
};

export type BeEdgeData = {
  id: string;
  from: string;
  to: string;
  style?: any;
};

export type BeMindmapContent = {
  layoutMode: string;
  theme: string;
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
// 3. VIẾT HÀM PHIÊN DỊCH (NORMALIZATION) - (Cập nhật GĐ B)
// =================================================================================

/**
 * Dịch 1 Node: Frontend (phẳng) -> Backend (lồng style)
 * [CẬP NHẬT GĐ B]: Thêm `styleLocked`
 */
export function normalizeNodeFEtoBE(feNode: FeNodeData): BeNodeData {
  const {
    // 1. Thuộc tính gốc của BE
    id,
    nodeText, // Đổi tên
    x,
    y,
    parentId,
    collapsed,
    side,

    // 2. Thuộc tính sẽ được lồng vào 'style'
    shape,
    color, // Đổi tên
    borderColor,
    borderWidth,
    borderStyle,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    textDecoration,
    textAlign,
    textColor,
    textCase,
    nodeLength,
    localStructure,
    branchColor,
    branchLineStyle,
    branchLineEnd,
    branchLineThickness,
    quickStyleId,
    hyperlink,
    styleLocked,
  } = feNode;

  // Tạo object 'style' lồng nhau
  const beStyle: Partial<BeNodeStyle> = {
    backgroundColor: color,
    textColor: textColor,
    shape: shape,
    borderColor,
    borderWidth,
    borderStyle,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    textDecoration,
    textAlign,
    textCase,
    nodeLength,
    localStructure,
    branchColor,
    branchLineStyle,
    branchLineEnd,
    branchLineThickness,
    quickStyleId: quickStyleId,
    styleLocked: styleLocked, // [MỚI GĐ B]
  };

  // Tạo object NodeData của BE
  const beNode: BeNodeData = {
    id,
    text: nodeText,
    x,
    y,
    parentId: parentId || null,
    collapsed: collapsed || false,
    side: side,
    style: beStyle,
    hyperlink: hyperlink,
  };

  return beNode;
}

/**
 * Dịch 1 Node: Backend (lồng style) -> Frontend (phẳng)
 * [CẬP NHẬT GĐ B]: Thêm `styleLocked`
 */
export function normalizeNodeBEtoFE(beNode: BeNodeData): FeNodeData {
  const { id, text, x, y, parentId, collapsed, side, style, hyperlink } = beNode;

  // [FIX] Thêm kiểm tra 'style' null (từ GĐ 5)
  const safeStyle = style || {};

  // "Làm phẳng" (flatten) object 'style'
  const feNode: FeNodeData = {
    id,
    nodeText: text,
    x,
    y,
    parentId: parentId || undefined,
    collapsed: collapsed || false,
    side: side,
    hyperlink: hyperlink || undefined,
    shape: safeStyle.shape,
    color: safeStyle.backgroundColor,
    borderColor: safeStyle.borderColor,
    borderWidth: safeStyle.borderWidth,
    borderStyle: safeStyle.borderStyle,
    fontFamily: safeStyle.fontFamily,
    fontSize: safeStyle.fontSize,
    fontWeight: safeStyle.fontWeight,
    fontStyle: safeStyle.fontStyle,
    textDecoration: safeStyle.textDecoration,
    textAlign: safeStyle.textAlign,
    textColor: safeStyle.textColor,
    textCase: safeStyle.textCase,
    nodeLength: safeStyle.nodeLength,
    localStructure: safeStyle.localStructure,
    branchColor: safeStyle.branchColor,
    branchLineStyle: safeStyle.branchLineStyle,
    branchLineEnd: safeStyle.branchLineEnd,
    branchLineThickness: safeStyle.branchLineThickness,
    quickStyleId: safeStyle.quickStyleId as any,
    styleLocked: safeStyle.styleLocked, // [MỚI GĐ B]
  };

  return feNode;
}

// =================================================================================
// 4. VIẾT HÀM PHIÊN DỊCH TOÀN BỘ CONTENT - (Giai đoạn 1 & 2)
// (Không thay đổi trong GĐ B, vì các hàm con đã được cập nhật)
// =================================================================================

export function normalizeContentFEtoBE(
  feNodes: FeNodeData[],
  feEdges: FeEdgeData[],
  globalSettings: { layoutMode?: string; theme?: string } = {}
): BeMindmapContent {
  const beNodes = feNodes.map(normalizeNodeFEtoBE); // Hàm này đã được cập nhật

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
      style: {
        shape: 'roundedRect',
        backgroundColor: '#FFFFFF',
        textColor: '#1E293B',
        borderStyle: 'solid',
        fontWeight: 'normal',
        fontStyle: 'normal',
      },
    });
    return {
      nodes: [rootNode],
      edges: [],
      layoutMode: 'mindmap',
      theme: 'light',
    };
  }

  const feNodes = beContent.nodes.map(normalizeNodeBEtoFE); // Hàm này đã được cập nhật

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
// (Không thay đổi trong GĐ B, vì các hàm con đã được cập nhật)
// =================================================================================

// Định nghĩa cấu trúc (cũ) của Guest Doc trong localStorage
type OldFeGuestMapItem = {
  id: string;
  name: string;
  createdAt: string;
};
type OldFeGuestDoc = {
  id: string;
  name: string;
  content: {
    nodes: { [key: string]: any }; // Dạng Map
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
      // 1. Tạo một đối tượng FeNodeData (phẳng) tạm thời
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
        textColor: oldNode.textColor,
        textCase: oldNode.textCase,
        nodeLength: oldNode.nodeLength,
        localStructure: oldNode.localStructure,
        branchColor: oldNode.branchColor,
        branchLineStyle: oldNode.branchLineStyle,
        branchLineEnd: oldNode.branchLineEnd,
        branchLineThickness: oldNode.branchLineThickness,
        quickStyleId: oldNode.quickStyleId,
        styleLocked: oldNode.styleLocked, // [MỚI GĐ B] Di cư trường mới
      };

      // 2. Tái sử dụng hàm chuẩn hóa
      return normalizeNodeFEtoBE(tempFeNode);
    });

    // 3. Tạo BeMindmapContent
    const beContent: BeMindmapContent = {
      layoutMode: 'mindmap',
      theme: 'light',
      nodes: beNodes,
      edges: oldEdgesList.map((e) => ({ id: e.id, from: e.from, to: e.to })),
    };

    // 4. Tạo BeMindmapDoc hoàn chỉnh
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