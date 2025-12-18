
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
  shape: 'roundedRect' | 'rectangle' | 'diamond' | 'ellipse'; 
  color?: string; // Backend's main color field
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
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  nodeLength?: 'fit' | number;
  quickStyleId?: string;
  localStructure?: 'default' | 'logic' | 'org';
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';
  styleLocked?: boolean;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
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
  boundary?: boolean;
};

export type BeEdgeData = {
  id: string;
  from: string;
  to: string;
  style?: any;
};

// [MỚI] Type cho Relationship - PHẢI KHỚP với useEditorStore.ts
export type BeRelationshipData = {
  id: string;
  from: string;
  to: string;
  label?: string;
  labelNodeId?: string;
  startMarker?: 'none' | 'arrow' | 'circle';
  endMarker?: 'none' | 'arrow' | 'circle';
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  color?: string;
};

// [MỚI] Type cho Summary - PHẢI KHỚP với useEditorStore.ts
export type BeSummaryData = {
  id: string;
  parentId: string;
  startNodeId: string;
  endNodeId: string;
  summaryText: string;
  summaryNodeId?: string;
  braceStyle?: 'curly' | 'square';
  color?: string;
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
  relationships?: BeRelationshipData[]; // [MỚI] Thêm relationships
  summaries?: BeSummaryData[]; // [MỚI] Thêm summaries
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
    boundary,
    imageUrl,
    imageWidth,
    imageHeight,
  } = feNode;

  // Tạo object 'style' lồng nhau
  const beStyle: Partial<BeNodeStyle> = {};
  
  // Chỉ gửi các field có giá trị (không undefined/null) để tránh ghi đè
  if (shape !== undefined) beStyle.shape = shape;
  if (color !== undefined) {
    beStyle.color = color;
    beStyle.backgroundColor = color;
  }
  if (textColor !== undefined) beStyle.textColor = textColor;
  if (borderColor !== undefined) beStyle.borderColor = borderColor;
  if (borderWidth !== undefined) beStyle.borderWidth = borderWidth;
  if (borderStyle !== undefined) beStyle.borderStyle = borderStyle;
  if (fontFamily !== undefined) beStyle.fontFamily = fontFamily;
  if (fontSize !== undefined) beStyle.fontSize = fontSize;
  if (fontWeight !== undefined) beStyle.fontWeight = fontWeight;
  if (fontStyle !== undefined) beStyle.fontStyle = fontStyle;
  if (textDecoration !== undefined) beStyle.textDecoration = textDecoration;
  if (textAlign !== undefined) beStyle.textAlign = textAlign;
  if (textCase !== undefined) beStyle.textCase = textCase;
  if (nodeLength !== undefined) beStyle.nodeLength = nodeLength;
  if (localStructure !== undefined) beStyle.localStructure = localStructure;
  if (branchColor !== undefined) beStyle.branchColor = branchColor;
  if (branchLineStyle !== undefined) beStyle.branchLineStyle = branchLineStyle;
  if (branchLineEnd !== undefined) beStyle.branchLineEnd = branchLineEnd;
  if (branchLineThickness !== undefined) beStyle.branchLineThickness = branchLineThickness;
  if (quickStyleId !== undefined) beStyle.quickStyleId = quickStyleId;
  if (styleLocked !== undefined) beStyle.styleLocked = styleLocked;
  if (imageUrl !== undefined) beStyle.imageUrl = imageUrl;
  if (imageWidth !== undefined) beStyle.imageWidth = imageWidth;
  if (imageHeight !== undefined) beStyle.imageHeight = imageHeight;

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
    boundary: boundary,
  };

  return beNode;
}

/**
 * Helper: Convert null to undefined để logic check undefined hoạt động đúng
 */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Dịch 1 Node: Backend (lồng style) -> Frontend (phẳng)
 */
export function normalizeNodeBEtoFE(beNode: BeNodeData): FeNodeData {
  const { id, text, x, y, parentId, collapsed, side, style, hyperlink, boundary } = beNode;

  const safeStyle = style || {};

  // "Làm phẳng" (flatten) object 'style'
  // QUAN TRỌNG: Convert null thành undefined để logic check trong getNodeComputedStyle hoạt động đúng
  const feNode: FeNodeData = {
    id,
    nodeText: text,
    x,
    y,
    parentId: parentId || undefined,
    collapsed: collapsed || false,
    side: side,
    hyperlink: hyperlink || undefined,
    boundary: boundary || false,
    shape: nullToUndefined(safeStyle.shape),
    color: nullToUndefined(safeStyle.backgroundColor || safeStyle.color),
    borderColor: nullToUndefined(safeStyle.borderColor),
    borderWidth: nullToUndefined(safeStyle.borderWidth),
    borderStyle: nullToUndefined(safeStyle.borderStyle),
    fontFamily: nullToUndefined(safeStyle.fontFamily),
    fontSize: nullToUndefined(safeStyle.fontSize),
    fontWeight: nullToUndefined(safeStyle.fontWeight),
    fontStyle: nullToUndefined(safeStyle.fontStyle),
    textDecoration: nullToUndefined(safeStyle.textDecoration),
    textAlign: nullToUndefined(safeStyle.textAlign),
    textColor: nullToUndefined(safeStyle.textColor),
    textCase: nullToUndefined(safeStyle.textCase),
    nodeLength: nullToUndefined(safeStyle.nodeLength),
    localStructure: nullToUndefined(safeStyle.localStructure),
    branchColor: nullToUndefined(safeStyle.branchColor),
    branchLineStyle: nullToUndefined(safeStyle.branchLineStyle),
    branchLineEnd: nullToUndefined(safeStyle.branchLineEnd),
    branchLineThickness: nullToUndefined(safeStyle.branchLineThickness),
    quickStyleId: nullToUndefined(safeStyle.quickStyleId) as any,
    styleLocked: nullToUndefined(safeStyle.styleLocked),
    imageUrl: nullToUndefined(safeStyle.imageUrl),
    imageWidth: nullToUndefined(safeStyle.imageWidth),
    imageHeight: nullToUndefined(safeStyle.imageHeight),
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
/**
 * [CẬP NHẬT] Dịch FE -> BE
 * Tự động lấy cài đặt global từ `useEditorStore`
 */
export function normalizeContentFEtoBE(
  feNodes: FeNodeData[],
  feEdges: FeEdgeData[],
  feRelationships: any[] = [], // [MERGE] Thêm tham số này (default rỗng)
  feSummaries: any[] = []      // [MERGE] Thêm tham số này (default rỗng)
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
    relationships: feRelationships, // [MERGE] Map sang BE
    summaries: feSummaries,         // [MERGE] Map sang BE
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
  relationships?: BeRelationshipData[]; // [MỚI] Thêm relationships
  summaries?: BeSummaryData[]; // [MỚI] Thêm summaries
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
      relationships: [], // [MỚI] Mặc định mảng rỗng
      summaries: [], // [MỚI] Mặc định mảng rỗng
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
    relationships: beContent.relationships || [], // [MỚI] Trả về relationships
    summaries: beContent.summaries || [], // [MỚI] Trả về summaries
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
  content: BeMindmapContent | {
    nodes: { [key: string]: any } | BeNodeData[]; // Hỗ trợ cả dạng Map (cũ) và Array (mới)
    edges: FeEdgeData[];
    layoutMode?: string;
    theme?: string;
    globalSettings?: BeGlobalSettings;
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

    let beContent: BeMindmapContent;

    // Kiểm tra xem content đã ở định dạng BE mới chưa
    if ('layoutMode' in oldDoc.content && Array.isArray(oldDoc.content.nodes)) {
      // Đã là định dạng mới (có globalSettings), chỉ cần dùng trực tiếp
      beContent = oldDoc.content as BeMindmapContent;
    } else {
      // Định dạng cũ (nodes là Map, không có globalSettings)
      const oldNodesList: any[] = Object.values((oldDoc.content as any).nodes || {});
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

      // 3. Tạo BeMindmapContent với globalSettings được suy luận từ nodes
      // Suy luận globalFont: dùng font phổ biến nhất trong nodes (nếu có)
      const fontCounts: { [font: string]: number } = {};
      oldNodesList.forEach(node => {
        if (node.fontFamily) {
          fontCounts[node.fontFamily] = (fontCounts[node.fontFamily] || 0) + 1;
        }
      });
      const mostCommonFont = Object.keys(fontCounts).length > 0
        ? Object.keys(fontCounts).reduce((a, b) => fontCounts[a] > fontCounts[b] ? a : b)
        : fonts[0].value;

      // Suy luận theme dựa vào màu nền hoặc màu nodes (nếu có)
      const hasCustomColors = oldNodesList.some(n => n.color || n.fill || n.quickStyleId);
      
      beContent = {
        layoutMode: 'mindmap',
        theme: 'light',
        nodes: beNodes,
        edges: oldEdgesList.map((e) => ({ id: e.id, from: e.from, to: e.to })),
        globalSettings: {
          fontFamily: mostCommonFont,
          branchLineWidth: 2,
          globalBranchColor: '#94A3B8',
          backgroundColor: '#FAFAFB',
          activeColorThemeId: 'dawn',
        }
      };
    }

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