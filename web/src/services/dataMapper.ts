
// 1. IMPORT TYPES CỦA FRONTEND
import {
  NodeData as FeNodeData,
  EdgeData as FeEdgeData,
  // [MỚI] Import store để lấy cài đặt global khi lưu
  useEditorStore, 
  fonts,
  colorThemes,
} from '../app/store/useEditorStore';

// =================================================================================
// 2. ĐỊNH NGHĨA TYPES (INTERFACE) CỦA BACKEND
// =================================================================================

export type BeNodeStyle = {
  // === Các trường BE gốc ===
  shape: 'rectangle' | 'roundedRect'; 
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

// [MỚI] Type cho cài đặt global
export type BeGlobalSettings = {
  fontFamily?: string;
  branchLineWidth?: number;
  isColoredBranch?: boolean;
  globalBranchColor?: string;
  backgroundColor?: string;
  activeColorThemeId?: string;
};

export type BeMindmapContent = {
  layoutMode: string;
  theme: string;
  nodes: BeNodeData[];
  edges: BeEdgeData[];
  globalSettings?: BeGlobalSettings; // [MỚI] Thêm trường này
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
 * Dịch 1 Node: Frontend (phẳng) -> Backend (lồng style)
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
    styleLocked: styleLocked, 
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
 */
export function normalizeNodeBEtoFE(beNode: BeNodeData): FeNodeData {
  const { id, text, x, y, parentId, collapsed, side, style, hyperlink } = beNode;

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
    styleLocked: safeStyle.styleLocked, 
  };

  return feNode;
}

// =================================================================================
// 4. VIẾT HÀM PHIÊN DỊCH TOÀN BỘ CONTENT
// =================================================================================

/**
 * [CẬP NHẬT] Dịch FE -> BE
 * Tự động lấy cài đặt global từ `useEditorStore`
 */
export function normalizeContentFEtoBE(
  feNodes: FeNodeData[],
  feEdges: FeEdgeData[],
): BeMindmapContent {
  const beNodes = feNodes.map(normalizeNodeFEtoBE);

  // [MỚI] Lấy cài đặt global từ store
  const {
    globalStructure,
    globalFont,
    branchLineWidth,
    globalBranchColor,
    backgroundColor,
    activeColorThemeId,
  } = useEditorStore.getState();

  const beGlobalSettings: BeGlobalSettings = {
    fontFamily: globalFont,
    branchLineWidth,
    globalBranchColor,
    backgroundColor,
    activeColorThemeId,
  };

  return {
    layoutMode: globalStructure || 'mindmap',
    theme: 'light', // Theme 'light'/'dark' không còn dùng, nhưng vẫn giữ trường
    nodes: beNodes,
    edges: feEdges.map((edge) => ({ ...edge })),
    globalSettings: beGlobalSettings, // [MỚI] Thêm cài đặt global
  };
}

/**
 * [CẬP NHẬT] Dịch BE -> FE
 * Trả về một object bao gồm các cài đặt global đã được làm phẳng
 */
export function normalizeContentBEtoFE(
  beContent: BeMindmapContent | undefined | null
): { 
  nodes: FeNodeData[]; 
  edges: FeEdgeData[]; 
  layoutMode: string; 
  theme: string;
  // [MỚI] Thêm các trường global
  fontFamily?: string;
  branchLineWidth?: number;
  globalBranchColor?: string;
  backgroundColor?: string;
  activeColorThemeId?: string;
} {
  // Lấy cài đặt global mặc định từ store
  const defaults = {
    fontFamily: fonts[0].value,
    branchLineWidth: 2,
    globalBranchColor: '#94A3B8',
    activeColorThemeId: 'dawn',
    backgroundColor: colorThemes['dawn'].background,
  };

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
        fontWeight: 'bold',
        fontStyle: 'normal',
        textCase: 'uppercase',
      },
    });
    return {
      nodes: [rootNode],
      edges: [],
      layoutMode: 'mindmap',
      theme: 'light',
      ...defaults, 
    };
  }

  const feNodes = beContent.nodes.map(normalizeNodeBEtoFE);
  const settings = beContent.globalSettings || {}; 

  return {
    nodes: feNodes,
    edges: beContent.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
    })),
    layoutMode: beContent.layoutMode || 'mindmap',
    theme: beContent.theme || 'light',
    fontFamily: settings.fontFamily || defaults.fontFamily,
    branchLineWidth: settings.branchLineWidth !== undefined ? settings.branchLineWidth : defaults.branchLineWidth,

    globalBranchColor: settings.globalBranchColor || defaults.globalBranchColor,
    activeColorThemeId: settings.activeColorThemeId || defaults.activeColorThemeId,
    backgroundColor: settings.backgroundColor || colorThemes[settings.activeColorThemeId as keyof typeof colorThemes]?.background || defaults.backgroundColor,
  };
}


// =================================================================================
// 5. GUEST DATA MIGRATION (Giai đoạn 4)
// (Không thay đổi)
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
        styleLocked: oldNode.styleLocked, 
      };

      // 2. Tái sử dụng hàm chuẩn hóa
      return normalizeNodeFEtoBE(tempFeNode);
    });

    // 3. Tạo BeMindmapContent (CHƯA có globalSettings, vì dữ liệu cũ không có)
    const beContent: BeMindmapContent = {
      layoutMode: 'mindmap',
      theme: 'light',
      nodes: beNodes,
      edges: oldEdgesList.map((e) => ({ id: e.id, from: e.from, to: e.to })),
      // globalSettings sẽ là undefined, server sẽ dùng mặc định
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