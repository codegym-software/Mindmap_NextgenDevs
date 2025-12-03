import { create } from "zustand";
import { isEqual } from "lodash";
import { 
  getBranchColorByDepth, 
  getContrastingTextColor
} from "../../utils/colorUtils";

// ================
// Định nghĩa Fonts
// ================
export const fonts = [
  { name: "Roboto", value: "Roboto, sans-serif" },
  { name: "Droid Serif", value: "Droid Serif, serif" },
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Montserrat", value: "Montserrat, sans-serif" },
  { name: "Lobster", value: "Lobster, cursive" },
  { name: "Pacifico", value: "Pacifico, cursive" },
  { name: "Roboto Mono", value: "Roboto Mono, monospace" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "Times New Roman, serif" },
  { name: "Courier New", value: "Courier New, monospace" },
  { name: "Verdana", value: "Verdana, sans-serif" },
];

// =================
// Định nghĩa Themes
// =================
export type ColorThemeStyle = {
  fill: string;
  color: string;
  stroke: string;
  textColor: string; 
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  textDecoration?: "none" | "underline" | "line-through";
  textcase?: "normal" | "uppercase" | "lowercase";
};

export type ColorTheme = {
  background: string; 
  quickStyles: {
    'important-dark': ColorThemeStyle;
    'important-light': ColorThemeStyle;
    'strikethrough': ColorThemeStyle;
    'default': ColorThemeStyle;
  },
  root: Partial<ColorThemeStyle>; 
};

// [CẬP NHẬT] Theme mặc định đơn giản hơn cho chế độ Đen/Trắng
export const colorThemes: Record<string, ColorTheme> = {
  dawn: {
    background: "#ffffffff", 
    quickStyles: {
      'important-dark': { fill: "#90074dff", color:"#970074ff", stroke: "#97266D", textColor: "#ffffffff", fontWeight: "bold" },
      'important-light': { fill: "#df1a5fff", color:"#b60ac0ff", stroke: "#ED89A7", textColor: "#ffffffff" },
      strikethrough: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#A0AEC0", textDecoration: "line-through" },
      default: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#4A5568" },
    },
    // Root mặc định là Đen, chữ Trắng
    root: { fill: "#ffffffff", stroke: "#343434ff", textColor: "#ae1e1eff"},
  },
};

export type NodeTopology = {
  depth: number;
  branchBaseColor: string; 
};

// ================
// Định nghĩa Types
// ================
export type GlobalStructure = 'mindmap' | 'logic' | 'org';
export type LocalStructure = 'default' | 'logic' | 'org';
export type QuickStyleId = 'default' | 'important-dark' | 'important-light' | 'strikethrough';

export type NodeData = {
  id: string;
  nodeText: string;
  x: number;
  y: number;
  parentId?: string;
  side?: 'left' | 'right';
  collapsed?: boolean;
  quickStyleId?: QuickStyleId;

  // Style thuộc tính
  shape?: 'rectangle' | 'roundedRect'; 
  color?: string; 
  hyperlink?: string;
  styleLocked?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  //ảnh
  imageUrl?: string;      
  imageWidth?: number; 
  imageHeight?: number;

  // Text
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
  textColor?: string;
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  nodeLength?: 'fit' | number;

  // Branch
  localStructure?: LocalStructure;
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';
  boundary?: boolean;
};

export type EdgeData = { id: string; from: string; to: string };

// Relationship - Đường mối quan hệ phi phân cấp
export type RelationshipData = {
  id: string;
  from: string; // Node ID
  to: string;   // Node ID
  label?: string;
  labelNodeId?: string; // Node ID cho label (có thể edit như node)
  startMarker?: 'none' | 'arrow' | 'circle';
  endMarker?: 'none' | 'arrow' | 'circle';
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  color?: string;
};

// Summary - Tóm tắt nhóm nodes anh em
export type SummaryData = {
  id: string;
  parentId: string; // Parent của nhóm nodes được tóm tắt
  startNodeId: string; // Node đầu tiên trong range
  endNodeId: string;   // Node cuối cùng trong range
  summaryText: string;
  summaryNodeId?: string; // Node tóm tắt (tạo tự động)
  braceStyle?: 'curly' | 'square';
  color?: string;
};

type Snapshot = { nodes: NodeData[]; edges: EdgeData[] };

const MAX_HISTORY = 100;

// =============
// Style Helpers
// =============

export const DEFAULT_NODE_STYLE: Partial<NodeData> = {
  shape: 'roundedRect',
  color: '#FFFFFF',
  borderColor: '#000000', 
  borderWidth: 2,
  borderStyle: 'solid',
  fontFamily: fonts[0].value,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'CENTER',
  textColor: '#000000ff', 
  nodeLength: 150,
  branchColor: undefined,
  branchLineStyle: 'bezier',
  branchLineEnd: 'none',
  branchLineThickness: 'normal',
  localStructure: 'default',
  quickStyleId: 'default',
};

export function getNodeComputedStyle(
  node: NodeData | null,
  theme: ColorTheme,
  globalFont: string,
  topology?: NodeTopology 
): NodeData {
  const baseStyle: Partial<NodeData> = {
    ...DEFAULT_NODE_STYLE,
    fontFamily: globalFont,
    color: theme.root.fill || '#FFFFFF', 
    borderColor: '#000000',
    textColor: '#000000',
  };

  if (!node) return baseStyle as NodeData;

  // 2. Áp dụng màu theo context (root/topology/floating)
  if (node.id === 'root') {
    baseStyle.color = theme.root.fill || '#000000';
    baseStyle.textColor = theme.root.textColor || '#FFFFFF';
    baseStyle.borderColor = theme.root.stroke || '#000000';
    baseStyle.borderWidth = 4;
    baseStyle.fontSize = 28;
    baseStyle.fontWeight = 'bold';
    baseStyle.textCase = 'uppercase';
  } else if (topology) {
    // Nodes có parent - apply màu theo depth
    const { depth, branchBaseColor } = topology;
    const smartColors = getBranchColorByDepth(branchBaseColor, depth);
    
    baseStyle.color = smartColors.bg;
    baseStyle.borderColor = smartColors.border;
    baseStyle.textColor = getContrastingTextColor(smartColors.bg);
    
    if (depth >= 6) baseStyle.borderWidth = 2;
  } else {
    // Floating nodes - dùng theme default (sẽ được override bởi quick style nếu có)
    const defaultStyle = theme.quickStyles.default;
    baseStyle.color = defaultStyle.fill || '#FFFFFF';
    baseStyle.borderColor = defaultStyle.stroke || '#CBD5E0';
    baseStyle.textColor = defaultStyle.textColor || '#4A5568';
  }

  // 3. [QUICK STYLE] - Override màu nếu node có quickStyleId
  // QUAN TRỌNG: Quick style chỉ apply khi node KHÔNG có màu riêng (undefined)
  if (node.quickStyleId && node.quickStyleId !== 'default' && theme.quickStyles[node.quickStyleId]) {
    const qs = theme.quickStyles[node.quickStyleId];
    
    // Chỉ apply quick style nếu node không có override riêng
    if (node.color === undefined) {
      baseStyle.color = qs.fill;
      baseStyle.textColor = qs.textColor;
    }
    if (node.borderColor === undefined) {
      baseStyle.borderColor = qs.stroke;
    }
    
    // Font styles từ quick style
    if (qs.fontWeight && node.fontWeight === undefined) {
      baseStyle.fontWeight = qs.fontWeight;
    }
    if (qs.textDecoration && node.textDecoration === undefined) {
      baseStyle.textDecoration = qs.textDecoration;
    }
    if (qs.fontSize && node.fontSize === undefined) {
      baseStyle.fontSize = qs.fontSize;
    }
    if (qs.textcase && node.textCase === undefined) {
      baseStyle.textCase = qs.textcase;
    }
  }

  // 4. [OVERRIDE]
  const computed: Partial<NodeData> = { ...baseStyle };
  const OVERRIDABLE_KEYS: (keyof NodeData)[] = [
    'shape', 'color', 'borderColor', 'borderWidth', 'borderStyle',
    'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 
    'textAlign', 'textColor', 'textCase', 'nodeLength',
    'fontFamily',
    'branchLineStyle', 'branchLineEnd', 'branchLineThickness',
    'imageUrl', 'imageWidth', 'imageHeight', 'hyperlink'
  ];

  const isRoot = node.id === 'root';
  OVERRIDABLE_KEYS.forEach(key => {
    // To preserve the root's identity, some properties are not overridable.
    if (isRoot && ['fontSize', 'fontWeight', 'textCase', 'borderWidth', 'color', 'textColor', 'borderColor'].includes(key)) {
      return;
    }

    if (node[key] !== undefined) {
      (computed as any)[key] = node[key];
    }
  });

  if (node.color !== undefined && node.textColor === undefined) {
    computed.textColor = getContrastingTextColor(node.color);
  }

  computed.id = node.id;
  computed.nodeText = node.nodeText;
  computed.x = node.x;
  computed.y = node.y;
  computed.parentId = node.parentId;
  computed.side = node.side;
  computed.collapsed = node.collapsed;
  computed.hyperlink = node.hyperlink;
  computed.styleLocked = node.styleLocked;
  computed.quickStyleId = node.quickStyleId; // Giữ quickStyleId để biết node dùng style nào

  // [ĐỒNG BỘ MÀU DÂY]
  computed.branchColor = node.branchColor ?? (topology ? topology.branchBaseColor : undefined);

  // Font logic: Nếu node không có fontFamily override, dùng globalFont
  // Nếu có fontFamily, giữ nguyên (đã được set ở bước OVERRIDE)
  if (computed.fontFamily === undefined) {
    computed.fontFamily = globalFont;
  }

  return computed as NodeData;
}

export function applyNodeDefaults(node: NodeData, theme: ColorTheme): Partial<NodeData> {
  const themeStyle = (node.id === 'root')
    ? theme.root
    : theme.quickStyles.default;
  
  return {
    ...DEFAULT_NODE_STYLE,
    ...(themeStyle as Partial<NodeData>),
    quickStyleId: 'default',
    shape: undefined,
    color: undefined,
    borderColor: undefined,
    borderWidth: undefined,
    borderStyle: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    fontStyle: undefined,
    textDecoration: undefined,
    textAlign: undefined,
    textColor: undefined,
    textCase: undefined,
    nodeLength: undefined, 
    localStructure: undefined,
    branchColor: undefined,
    branchLineStyle: undefined,
    branchLineEnd: undefined,
    branchLineThickness: undefined,
    styleLocked: undefined, 
    hyperlink: undefined, 
    imageUrl: undefined,
    imageWidth: undefined,
    imageHeight: undefined, 
  };
}

// =========
// Định nghĩa State
// =========
type State = {
  nodes: NodeData[];
  edges: EdgeData[];
  relationships: RelationshipData[];
  summaries: SummaryData[];
  history: Snapshot[];
  future: Snapshot[];

  globalStructure: GlobalStructure;
  globalFont: string;
  branchLineWidth: number;
  activeColorThemeId: string;
  globalBranchColor: string; 
  backgroundColor: string; 

  isDirty: boolean; 
  currentMindmapId: string | null; 
  currentMindmapName: string; 

  setGraph: (n: NodeData[], e: EdgeData[]) => void;
  push: (n: NodeData[], e: EdgeData[]) => void;
  undo: () => Snapshot | null;
  redo: () => Snapshot | null;
  clear: () => void;
  
  set: (p: Partial<State>) => void;
  toggleNodeBoundary: (nodeId: string) => void;
  addRelationship: (from: string, to: string) => void;
  updateRelationship: (id: string, updates: Partial<RelationshipData>) => void;
  updateRelationshipLabel: (id: string, label: string) => void;
  removeRelationship: (id: string) => void;
  addSummary: (parentId: string, startNodeId: string, endNodeId: string, text: string) => void;
  updateSummary: (id: string, updates: Partial<SummaryData>) => void;
  removeSummary: (id: string) => void;
};

export const useEditorStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
  relationships: [],
  summaries: [],
  history: [],
  future: [],

  globalStructure: 'mindmap',
  globalFont: fonts[0].value,
  branchLineWidth: 2,
  activeColorThemeId: 'dawn',
  globalBranchColor: '#94A3B8', 
  backgroundColor: '#FAFAFB', 

  isDirty: false,
  currentMindmapId: null,
  currentMindmapName: 'Đang tải...',

  setGraph: (n, e) => {
    set({ nodes: n, edges: e });
  },

  push: (n, e) => {
    const currentState: Snapshot = { nodes: n, edges: e };
    const lastHistoryState = get().history.at(-1);

    if (!lastHistoryState || !isEqual(lastHistoryState, currentState)) {
      const nextHistory = [...get().history, currentState].slice(-MAX_HISTORY);
      set({ history: nextHistory, future: [] });
    }
  },

  undo: () => {
    const h = get().history.slice();
    if (h.length <= 1) return null;

    const current = h.pop()!;
    const prev = h.at(-1)!;

    set({
      history: h,
      future: [current, ...get().future],
      nodes: prev.nodes,
      edges: prev.edges,
      isDirty: true, 
    });
    return prev;
  },

  redo: () => {
    const f = get().future.slice();
    if (!f.length) return null;

    const next = f.shift()!;
    set({
      history: [...get().history, next],
      future: f,
      nodes: next.nodes,
      edges: next.edges,
      isDirty: true, 
    });
    return next;
  },

  clear: () => set({ history: [], future: [] }),
  
  set: (p) => set(p),

  toggleNodeBoundary: (nodeId: string) => {
    const { nodes, edges } = get();
    const newNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, boundary: !n.boundary } : n
    );
    set({ nodes: newNodes, isDirty: true });
    get().push(newNodes, edges);
  },

  addRelationship: (from: string, to: string) => {
    const { relationships, nodes, edges } = get();
    
    const relationshipId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const labelNodeId = `label_${relationshipId}`;
    
    // Tạo node label nhỏ trong suốt với width fit-content
    const labelNode: NodeData = {
      id: labelNodeId,
      parentId: relationshipId, // Parent là relationship (special case)
      nodeText: 'relationship',
      x: 0, // Sẽ được tính lại khi render
      y: 0,
      shape: 'roundedRect',
      color: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      fontSize: 11,
      fontWeight: 'normal',
      nodeLength: 'fit', // Width tự động fit nội dung
    };
    
    const newRelationship: RelationshipData = {
      id: relationshipId,
      from,
      to,
      labelNodeId,
      startMarker: 'none',
      endMarker: 'arrow',
      color: '#3b82f6',
    };
    
    set({ 
      nodes: [...nodes, labelNode],
      relationships: [...relationships, newRelationship], 
      isDirty: true 
    });
  },

  updateRelationship: (id: string, updates: Partial<RelationshipData>) => {
    const { relationships } = get();
    set({
      relationships: relationships.map(r => r.id === id ? { ...r, ...updates } : r),
      isDirty: true
    });
  },

  updateRelationshipLabel: (id: string, label: string) => {
    const { relationships } = get();
    set({
      relationships: relationships.map(r => r.id === id ? { ...r, label } : r),
      isDirty: true
    });
  },

  removeRelationship: (id: string) => {
    const { relationships } = get();
    set({ relationships: relationships.filter(r => r.id !== id), isDirty: true });
  },

  addSummary: (parentId: string, startNodeId: string, endNodeId: string, text: string) => {
    const { summaries, nodes, edges } = get();
    
    const summaryId = `sum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Tính toán vị trí summary node dựa trên brace tip position
    const parentNode = nodes.find(n => n.id === parentId);
    const siblings = nodes.filter(n => n.parentId === parentId);
    const startNode = nodes.find(n => n.id === startNodeId);
    const endNode = nodes.find(n => n.id === endNodeId);
    
    // Calculate approximate position for summary node
    // This will be refined by layout later, but gives a better initial position
    let summaryX = 0;
    let summaryY = 0;
    
    if (startNode && endNode) {
      const isLeft = startNode.side === 'left';
      const direction = isLeft ? -1 : 1;
      
      // Average Y position between start and end nodes
      summaryY = (startNode.y + endNode.y) / 2;
      
      // Place summary node outward from the nodes
      // Use a rough estimate - will be refined by layout
      const avgX = (startNode.x + endNode.x) / 2;
      summaryX = avgX + (direction * 150); // 150px outward from average position
    }
    
    // Lấy màu của parent node để áp dụng cho summary
    const parentBorderColor = parentNode?.borderColor || '#f59e0b';
    
    // Tạo summary node mới - parent là summaryId đặc biệt
    const summaryNodeId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const summaryNode: NodeData = {
      id: summaryNodeId,
      nodeText: text || 'Summary',
      x: summaryX,
      y: summaryY,
      parentId: summaryId, // Parent là chính summary ID
      side: startNode?.side,
      shape: 'roundedRect',
      color: 'transparent', // Transparent background
      borderColor: parentBorderColor, // Inherit parent border color
      borderWidth: 2,
    };
    
    const newSummary: SummaryData = {
      id: summaryId,
      parentId,
      startNodeId,
      endNodeId,
      summaryText: text || 'Summary',
      summaryNodeId,
      braceStyle: 'curly',
      color: parentBorderColor, // Inherit parent border color for brace
    };
    
    // Tạo edge đặc biệt nối từ summary ID đến summary node
    const newEdge: EdgeData = {
      id: `edge_${summaryNodeId}`,
      from: summaryId,
      to: summaryNodeId,
    };
    
    set({ 
      summaries: [...summaries, newSummary],
      nodes: [...nodes, summaryNode],
      edges: [...edges, newEdge],
      isDirty: true 
    });
  },

  updateSummary: (id: string, updates: Partial<SummaryData>) => {
    const { summaries } = get();
    set({
      summaries: summaries.map(s => s.id === id ? { ...s, ...updates } : s),
      isDirty: true
    });
  },

  removeSummary: (id: string) => {
    const { summaries, nodes, edges } = get();
    const summary = summaries.find(s => s.id === id);
    if (!summary) return;
    
    // Xóa summary node và edge
    const newNodes = nodes.filter(n => n.id !== summary.summaryNodeId);
    const newEdges = edges.filter(e => e.to !== summary.summaryNodeId);
    
    set({ 
      summaries: summaries.filter(s => s.id !== id),
      nodes: newNodes,
      edges: newEdges,
      isDirty: true 
    });
  },
}));