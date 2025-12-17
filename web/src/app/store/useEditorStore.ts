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
      'strikethrough': { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#A0AEC0", textDecoration: "line-through" },
      'default': { fill: "#F0F9FF", color:"#F0F9FF", stroke: "#3B82F6", textColor: "#1E3A8A" },
    },
    root: { fill: "transparent", stroke: "transparent", textColor: "#000000"},
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
  
  // Transition state
  isTransitioning?: boolean;
};

export type EdgeData = { id: string; from: string; to: string };

// Relationship - Đường mối quan hệ phi phân cấp
export type RelationshipData = {
  id: string;
  from: string; // Node ID
  to: string;   // Node ID
  label?: string;
  labelNodeId?: string; // Node ID cho label
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
  summaryNodeId?: string; // Node tóm tắt
  braceStyle?: 'curly' | 'square';
  color?: string;
};

// History Command Types
type NodeDiff = {
    id: string;
    from?: Partial<NodeData>;
    to?: Partial<NodeData>;
};

type EdgeDiff = {
    id: string;
    from?: Partial<EdgeData>;
    to?: Partial<EdgeData>;
};

type HistoryCommand = {
    type: 'NODES_CHANGE';
    added?: NodeData[];
    removed?: NodeData[];
    updated?: { id: string; from: Partial<NodeData>; to: Partial<NodeData> }[];
    addedEdges?: EdgeData[];
    removedEdges?: EdgeData[];
};

type Snapshot = { nodes: NodeData[]; edges: EdgeData[] }; // Legacy type, kept if needed

const MAX_HISTORY = 100;

// =============
// Style Helpers
// =============

export const DEFAULT_NODE_STYLE: Partial<NodeData> = {
  shape: 'roundedRect',
  color: '#F0F9FF',
  borderColor: '#3B82F6', 
  borderWidth: 2,
  borderStyle: 'solid',
  fontFamily: fonts[0].value,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'CENTER',
  textColor: '#1E3A8A',
  nodeLength: 150,
  branchColor: undefined,
  branchLineStyle: 'bezier',
  branchLineEnd: 'none',
  branchLineThickness: undefined,
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

  // 2. Áp dụng style theo Level (depth)
  if (node.id === 'root') {
    baseStyle.color = theme.root.fill;
    baseStyle.textColor = theme.root.textColor;
    baseStyle.borderColor = theme.root.stroke;
    baseStyle.borderWidth = 0;
    baseStyle.fontSize = 40;
    baseStyle.fontWeight = 'bold';
    baseStyle.shape = 'roundedRect';
    baseStyle.nodeLength = 'fit';
  } else if (topology) {
    const { depth, branchBaseColor } = topology;
    const smartColors = getBranchColorByDepth(branchBaseColor, depth);
    
    if (depth === 1) {
      baseStyle.color = smartColors.bg;
      baseStyle.borderColor = smartColors.border;
      baseStyle.textColor = getContrastingTextColor(smartColors.bg);
      baseStyle.shape = 'roundedRect';
      baseStyle.fontSize = 18;
      baseStyle.fontWeight = 'normal';
      baseStyle.borderWidth = 2;
    } else if (depth === 2) {
      baseStyle.color = smartColors.bg;
      baseStyle.borderColor = smartColors.border;
      baseStyle.textColor = getContrastingTextColor(smartColors.bg);
      baseStyle.shape = 'roundedRect';
      baseStyle.fontSize = 16;
      baseStyle.fontWeight = 'normal';
      baseStyle.borderWidth = 1;
    } else {
      baseStyle.color = 'transparent';
      baseStyle.borderColor = smartColors.border;
      baseStyle.textColor = '#2D3748';
      baseStyle.shape = 'rectangle';
      baseStyle.fontSize = 14;
      baseStyle.fontWeight = 'normal';
      baseStyle.borderWidth = 0;
    }
  } else {
    const defaultStyle = theme.quickStyles.default;
    baseStyle.color = defaultStyle.fill || '#FFFFFF';
    baseStyle.borderColor = defaultStyle.stroke || '#CBD5E0';
    baseStyle.textColor = defaultStyle.textColor || '#21b9d3ff';
  }

  // 3. [QUICK STYLE]
  if (node.quickStyleId && node.quickStyleId !== 'default' && theme.quickStyles[node.quickStyleId]) {
    const qs = theme.quickStyles[node.quickStyleId];
    if (node.color === undefined) {
      baseStyle.color = qs.fill;
      baseStyle.textColor = qs.textColor;
    }
    if (node.borderColor === undefined) {
      baseStyle.borderColor = qs.stroke;
    }
    if (qs.fontWeight && node.fontWeight === undefined) baseStyle.fontWeight = qs.fontWeight;
    if (qs.textDecoration && node.textDecoration === undefined) baseStyle.textDecoration = qs.textDecoration;
    if (qs.fontSize && node.fontSize === undefined) baseStyle.fontSize = qs.fontSize;
    if (qs.textcase && node.textCase === undefined) baseStyle.textCase = qs.textcase;
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

  OVERRIDABLE_KEYS.forEach(key => {
    if (node[key] !== undefined) {
      (computed as any)[key] = node[key];
    }
  });

  if (node.id === 'root') {
    computed.nodeLength = 'fit';
  }

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
  computed.quickStyleId = node.quickStyleId;
  computed.branchColor = node.branchColor ?? (topology ? topology.branchBaseColor : undefined);

  if (computed.fontFamily === undefined) {
    computed.fontFamily = globalFont;
  }

  return computed as NodeData;
}

export function applyNodeDefaults(node: NodeData, theme: ColorTheme): Partial<NodeData> {
  const themeStyle = (node.id === 'root') ? theme.root : theme.quickStyles.default;
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
// Helpers for Diff
// =========
function differenceById<T extends { id: string }>(arr1: T[], arr2: T[]): T[] {
    const ids2 = new Set(arr2.map(x => x.id));
    return arr1.filter(x => !ids2.has(x.id));
}

function intersectionById<T extends { id: string }>(arr1: T[], arr2: T[]): T[] {
    const ids2 = new Set(arr2.map(x => x.id));
    return arr1.filter(x => ids2.has(x.id));
}

// So sánh nông để tìm thay đổi
function shallowNodeDiff(a: NodeData, b: NodeData): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof NodeData>;
    for (const key of keys) {
        if (key === 'isTransitioning') continue; // Bỏ qua state tạm thời
        if (!isEqual(a[key], b[key])) return true;
    }
    return false;
}

// =========
// Định nghĩa State
// =========
export type PeerInfo = {
  x: number;
  y: number;
  id: string;
  name?: string;
  color?: string;
  lastSeen: number;
};

type State = {
  nodes: NodeData[];
  edges: EdgeData[];
  relationships: RelationshipData[];
  summaries: SummaryData[];
  history: HistoryCommand[];
  future: HistoryCommand[];
  peers: Record<string, PeerInfo>;

  globalStructure: GlobalStructure;
  globalFont: string;
  branchLineWidth: number;
  activeColorThemeId: string;
  globalBranchColor: string; 
  backgroundColor: string; 

  scale: number;
  pos: { x: number; y: number };
  isDirty: boolean; 
  currentMindmapId: string | null; 
  currentMindmapName: string;
  hasManuallyRenamedMindmap: boolean; 

  // Actions
  setScale: (v: number) => void;
  setPos: (p: { x: number; y: number }) => void;
  setIsDirty: (isDirty: boolean) => void; 
  updatePeerCursor: (id: string, x: number, y: number) => void;
  setPeerInfo: (id: string, info: { name: string; color: string }) => void;
  removePeer: (id: string) => void;
  
  // [QUAN TRỌNG] Hai hàm setGraph khác nhau
  setGraph: (n: NodeData[], e: EdgeData[]) => void; // Dùng cho Realtime/Load (KHÔNG Undo)
  applyUserAction: (n: NodeData[], e: EdgeData[]) => void; // Dùng cho User (CÓ Undo)
  
  undo: () => void;
  redo: () => void;
  clear: () => void;
  set: (p: Partial<State>) => void;
  
  // Feature Actions
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
  peers: {},
  scale: 1,
  pos: { x: 0, y: 0 },

  globalStructure: 'mindmap',
  globalFont: fonts[0].value,
  branchLineWidth: 2,
  activeColorThemeId: 'dawn',
  globalBranchColor: '#BFDBFE', 
  backgroundColor: '#FAFAFB', 
  isDirty: false,
  currentMindmapId: null,
  currentMindmapName: 'Đang tải...',
  hasManuallyRenamedMindmap: false,

  setScale: (v) => set({ scale: v }),
  setPos: (p) => set({ pos: p }),
  setIsDirty: (status) => set({ isDirty: status }),
  set: (p) => set(p),

  updatePeerCursor: (id, x, y) => set((state) => {
    const peer = state.peers[id];
    if (!peer) return state;
    return { peers: { ...state.peers, [id]: { ...peer, x, y, lastSeen: Date.now() } } };
  }),
  setPeerInfo: (id, info) => set((state) => ({
    peers: { ...state.peers, [id]: { ...(state.peers[id] || { x: 0, y: 0, lastSeen: Date.now() }), id, ...info } }
  })),
  removePeer: (id) => set((state) => {
    const { [id]: _, ...rest } = state.peers;
    return { peers: rest };
  }),

  // 1. setGraph: Dùng khi nhận dữ liệu từ Server hoặc khi Load file
  // Không ghi vào History để tránh Undo làm mất dữ liệu đồng bộ
  setGraph: (n, e) => set({ nodes: n, edges: e, isDirty: true }),

  // 2. applyUserAction: Dùng khi User thao tác (Kéo, Thêm, Sửa, Xóa)
  // Tự động tính toán Diff và ghi vào History
  applyUserAction: (newNodes, newEdges) => {
    const { nodes: oldNodes, edges: oldEdges, history } = get();
    
    // --- Tính toán Diff Nodes ---
    const addedNodes = differenceById(newNodes, oldNodes);
    const removedNodes = differenceById(oldNodes, newNodes);

    const commonOldNodes = intersectionById(oldNodes, newNodes);
    const commonNewNodes = intersectionById(newNodes, oldNodes);

    const updatedNodes: { id: string; from: Partial<NodeData>; to: Partial<NodeData> }[] = [];
    
    commonNewNodes.forEach(newNode => {
        const oldNode = commonOldNodes.find(n => n.id === newNode.id);
        if (oldNode && shallowNodeDiff(oldNode, newNode)) {
          updatedNodes.push({ id: newNode.id, from: oldNode, to: newNode });
        }
    });

    // --- Tính toán Diff Edges ---
    const addedEdges = differenceById(newEdges, oldEdges);
    const removedEdges = differenceById(oldEdges, newEdges);

    if (addedNodes.length === 0 && removedNodes.length === 0 && updatedNodes.length === 0 && addedEdges.length === 0 && removedEdges.length === 0) {
        return; // Không có gì thay đổi
    }

    // Tạo Command
    const command: HistoryCommand = {
        type: 'NODES_CHANGE',
        added: addedNodes,
        removed: removedNodes,
        updated: updatedNodes,
        addedEdges: addedEdges,
        removedEdges: removedEdges
    };

    // Cập nhật Store + History một thể
    set({
        nodes: newNodes,
        edges: newEdges,
        history: [...history, command].slice(-MAX_HISTORY),
        future: [],
        isDirty: true
    });
  },

  // --- Logic Undo thông minh (Chỉ đảo ngược thay đổi của User) ---
  undo: () => {
    const { history, future, nodes, edges } = get();
    if (history.length === 0) return;

    const cmd = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newFuture = [cmd, ...future];

    let currentNodes = [...nodes];
    let currentEdges = [...edges];

    // Đảo ngược Add -> Xóa
    if (cmd.added && cmd.added.length > 0) {
        const idsToRemove = new Set(cmd.added.map(n => n.id));
        currentNodes = currentNodes.filter(n => !idsToRemove.has(n.id));
    }
    // Đảo ngược Remove -> Thêm lại
    if (cmd.removed && cmd.removed.length > 0) {
        currentNodes = [...currentNodes, ...cmd.removed];
    }
    // Đảo ngược Update -> Gán lại giá trị cũ (from)
    if (cmd.updated && cmd.updated.length > 0) {
        const updateMap = new Map(cmd.updated.map(u => [u.id, u.from]));
        currentNodes = currentNodes.map(n => {
            if (updateMap.has(n.id)) {
                return { ...n, ...updateMap.get(n.id) };
            }
            return n;
        });
    }
    // Edges tương tự
    if (cmd.addedEdges && cmd.addedEdges.length > 0) {
        const idsToRemove = new Set(cmd.addedEdges.map(e => e.id));
        currentEdges = currentEdges.filter(e => !idsToRemove.has(e.id));
    }
    if (cmd.removedEdges && cmd.removedEdges.length > 0) {
        currentEdges = [...currentEdges, ...cmd.removedEdges];
    }

    set({ nodes: currentNodes, edges: currentEdges, history: newHistory, future: newFuture, isDirty: true });
  },

  redo: () => {
    const { history, future, nodes, edges } = get();
    if (future.length === 0) return;

    const cmd = future[0];
    const newFuture = future.slice(1);
    const newHistory = [...history, cmd];

    let currentNodes = [...nodes];
    let currentEdges = [...edges];

    // Redo Add -> Thêm
    if (cmd.added && cmd.added.length > 0) {
        currentNodes = [...currentNodes, ...cmd.added];
    }
    // Redo Remove -> Xóa
    if (cmd.removed && cmd.removed.length > 0) {
        const idsToRemove = new Set(cmd.removed.map(n => n.id));
        currentNodes = currentNodes.filter(n => !idsToRemove.has(n.id));
    }
    // Redo Update -> Gán giá trị mới (to)
    if (cmd.updated && cmd.updated.length > 0) {
        const updateMap = new Map(cmd.updated.map(u => [u.id, u.to]));
        currentNodes = currentNodes.map(n => {
            if (updateMap.has(n.id)) {
                return { ...n, ...updateMap.get(n.id) };
            }
            return n;
        });
    }
    if (cmd.addedEdges && cmd.addedEdges.length > 0) {
        currentEdges = [...currentEdges, ...cmd.addedEdges];
    }
    if (cmd.removedEdges && cmd.removedEdges.length > 0) {
        const idsToRemove = new Set(cmd.removedEdges.map(e => e.id));
        currentEdges = currentEdges.filter(e => !idsToRemove.has(e.id));
    }

    set({ nodes: currentNodes, edges: currentEdges, history: newHistory, future: newFuture, isDirty: true });
  },

  clear: () => set({ history: [], future: [] }),

  toggleNodeBoundary: (nodeId: string) => {
    const { nodes, edges } = get();
    const newNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, boundary: !n.boundary } : n
    );
    // Sử dụng applyUserAction thay vì push cũ
    get().applyUserAction(newNodes, edges);
  },

  addRelationship: (from: string, to: string) => {
    const { relationships, nodes, edges } = get();
    
    const relationshipId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const labelNodeId = `label_${relationshipId}`;
    
    // Tạo node label nhỏ trong suốt với width fit-content
    const labelNode: NodeData = {
      id: labelNodeId,
      parentId: relationshipId, 
      nodeText: 'relationship',
      x: 0, 
      y: 0,
      shape: 'roundedRect',
      color: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      fontSize: 11,
      fontWeight: 'normal',
      nodeLength: 'fit', 
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
    
    // Lưu ý: Phần này đang dùng set trực tiếp, không qua Undo History (do applyUserAction chỉ track Nodes/Edges chính)
    // Nếu muốn Undo được Relationship, cần mở rộng applyUserAction
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
    const startNode = nodes.find(n => n.id === startNodeId);
    const endNode = nodes.find(n => n.id === endNodeId);
    
    let summaryX = 0;
    let summaryY = 0;
    
    if (startNode && endNode) {
      const isLeft = startNode.side === 'left';
      const direction = isLeft ? -1 : 1;
      
      // Average Y position between start and end nodes
      summaryY = (startNode.y + endNode.y) / 2;
      
      // Place summary node outward from the nodes
      const avgX = (startNode.x + endNode.x) / 2;
      summaryX = avgX + (direction * 150); 
    }
    
    // Lấy màu của parent node để áp dụng cho summary
    const parentBorderColor = parentNode?.borderColor || '#484747ff';
    
    // Tạo summary node mới - parent là summaryId đặc biệt
    const summaryNodeId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const summaryNode: NodeData = {
      id: summaryNodeId,
      nodeText: text || 'Summary',
      x: summaryX,
      y: summaryY,
      parentId: summaryId, 
      side: startNode?.side,
      shape: 'roundedRect',
      color: 'transparent', 
      borderColor: parentBorderColor, 
      borderWidth: 2,
      textColor: '#8f5f00ff',
    };
    
    const newSummary: SummaryData = {
      id: summaryId,
      parentId,
      startNodeId,
      endNodeId,
      summaryText: text || 'Summary',
      summaryNodeId,
      braceStyle: 'curly',
      color: parentBorderColor, 
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