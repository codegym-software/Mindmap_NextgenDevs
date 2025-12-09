import { create } from "zustand";
import { isEqual, differenceBy, intersectionBy } from "lodash";
import { getBranchColorByDepth, getContrastingTextColor } from '../../utils/colorUtils';

// =============================================================================
// 1. CONSTANTS & HELPERS
// =============================================================================
const DEFAULT_PALETTE = [
  '#EF4444', '#F97316', '#FACC15', '#22C55E', 
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
];

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

export const DEFAULT_NODE_STYLE: Partial<NodeData> = {
  shape: 'roundedRect',
  color: '#FFFFFF',
  borderColor: '#CBD5E0',
  borderWidth: 2,
  borderStyle: 'solid',
  fontFamily: fonts[0].value,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  textColor: '#4A5568',
  textCase: 'normal',
  nodeLength: 'fit',
  branchColor: undefined,
  branchLineStyle: 'bezier',
  branchLineEnd: 'none',
  branchLineThickness: 'normal',
  localStructure: 'default',
  quickStyleId: 'default',
};

// =============================================================================
// 2. TYPES DEFINITIONS
// =============================================================================
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
  shape?: 'rectangle' | 'roundedRect'; 
  color?: string; 
  hyperlink?: string;
  styleLocked?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  nodeLength?: 'fit' | number;
  localStructure?: LocalStructure;
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';
};

export type EdgeData = { id: string; from: string; to: string };

export type NodeTopology = {
  depth: number;
  branchIndex: number;
};

export type ColorThemeStyle = {
  fill: string; color: string; stroke: string; textColor: string; 
  fontSize?: number; fontWeight?: "normal" | "bold"; textDecoration?: "none" | "underline" | "line-through";
};

export type ColorTheme = {
  background: string; 
  quickStyles: { [key: string]: ColorThemeStyle };
  root: Partial<ColorThemeStyle>;
};

export const colorThemes: Record<string, ColorTheme> = {
  dawn: {
    background: "#ffffffff", 
    quickStyles: {
      'important-dark': { fill: "#420a27ff", color:"#970074ff", stroke: "#97266D", textColor: "#ffffffff", fontSize:18, fontWeight: "bold" },
      'important-light': { fill: "#FBB6CE", color:"#b60ac0ff", stroke: "#ED89A7", textColor: "#ffffffff" },
      strikethrough: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#A0AEC0", textDecoration: "line-through" },
      default: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#4A5568" },
    },
    root: { fill: "#6366F1", stroke: "#4338CA", textColor: "#650505ff" },
  },
};

export type PeerState = {
  id: string;
  name: string; 
  color: string;
  x: number;    
  y: number;    
  lastSeen: number;
};

// [UNDO/REDO] Cấu trúc Command (Lưu sự thay đổi thay vì lưu toàn bộ Snapshot)
type HistoryCommand = {
  type: 'NODES_CHANGE' | 'EDGES_CHANGE';
  added?: NodeData[];
  removed?: NodeData[];
  updated?: { id: string; from: Partial<NodeData>; to: Partial<NodeData> }[];
  addedEdges?: EdgeData[];
  removedEdges?: EdgeData[];
};

const MAX_HISTORY = 50;

// =============================================================================
// 4. HELPER FUNCTIONS
// =============================================================================
export function getNodeComputedStyle(
  node: NodeData | null,
  theme: ColorTheme,
  globalFont: string,
  topology?: NodeTopology
): NodeData {
  const baseStyle: Partial<NodeData> = { ...DEFAULT_NODE_STYLE, fontFamily: globalFont };
  if (!node) return baseStyle as NodeData;

  let themeStyle = node.id === 'root' ? theme.root : (node.quickStyleId ? theme.quickStyles[node.quickStyleId] : theme.quickStyles.default);
  const merged: Partial<NodeData> = { ...baseStyle, ...(themeStyle as Partial<NodeData>) };

  if (topology && node.id !== 'root' && !node.styleLocked) {
    const { depth, branchIndex } = topology;
    const palette = DEFAULT_PALETTE;
    const baseHueColor = palette[branchIndex % palette.length];
    const smartColors = getBranchColorByDepth(baseHueColor, depth);
    merged.color = smartColors.bg;
    merged.borderColor = smartColors.border;
    merged.textColor = getContrastingTextColor(smartColors.bg);
    if (depth >= 6) merged.borderWidth = 2;
  }

  (Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>).forEach(key => {
    if (node[key] !== undefined) (merged as any)[key] = node[key];
  });

  if (node.id === 'root') {
    merged.fontSize = (merged.fontSize || 16) + 8;
    merged.fontWeight = 'bold';
    merged.nodeLength = 300;
    merged.textColor = '#000000'; 
    merged.textCase = 'uppercase';
  }
  
  return { ...merged, ...node } as NodeData;
}

export function applyNodeDefaults(node: NodeData, theme: ColorTheme): Partial<NodeData> {
  const themeStyle = (node.id === 'root') ? theme.root : theme.quickStyles.default;
  return {
    ...DEFAULT_NODE_STYLE,
    ...(themeStyle as Partial<NodeData>),
    quickStyleId: 'default',
    shape: undefined, color: undefined, borderColor: undefined, borderWidth: undefined, borderStyle: undefined,
    fontFamily: undefined, fontSize: undefined, fontWeight: undefined, fontStyle: undefined, textDecoration: undefined,
    textAlign: undefined, textColor: undefined, textCase: undefined, nodeLength: undefined, localStructure: undefined,
    branchColor: undefined, branchLineStyle: undefined, branchLineEnd: undefined, branchLineThickness: undefined,
    styleLocked: undefined, hyperlink: undefined,
  };
}

// =============================================================================
// 3. STORE STATE
// =============================================================================
type State = {
  nodes: NodeData[];
  edges: EdgeData[];
  history: HistoryCommand[];
  future: HistoryCommand[];
  scale: number;
  pos: { x: number; y: number };
  
  globalStructure: GlobalStructure;
  globalFont: string;
  branchLineWidth: number;
  isColoredBranch: boolean;
  activeColorThemeId: string;
  globalBranchColor: string; 
  backgroundColor: string;
  isDirty: boolean;
  currentMindmapId: string | null;
  currentMindmapName: string;

  peers: Record<string, PeerState>;
  
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
};

export const useEditorStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],
  peers: {},
  scale: 1,
  pos: { x: 0, y: 0 },

  globalStructure: 'mindmap',
  globalFont: fonts[0].value,
  branchLineWidth: 2,
  isColoredBranch: true,
  activeColorThemeId: 'dawn',
  globalBranchColor: '#94A3B8', 
  backgroundColor: '#FAFAFB', 
  
  isDirty: false,
  currentMindmapId: null,
  currentMindmapName: 'Đang tải...',

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
    const addedNodes = differenceBy(newNodes, oldNodes, 'id');
    const removedNodes = differenceBy(oldNodes, newNodes, 'id');
    
    const commonOldNodes = intersectionBy(oldNodes, newNodes, 'id');
    const commonNewNodes = intersectionBy(newNodes, oldNodes, 'id');
    const updatedNodes: { id: string; from: Partial<NodeData>; to: Partial<NodeData> }[] = [];
    
    commonNewNodes.forEach(newNode => {
        const oldNode = commonOldNodes.find(n => n.id === newNode.id);
        if (oldNode && !isEqual(oldNode, newNode)) {
            updatedNodes.push({ id: newNode.id, from: oldNode, to: newNode });
        }
    });

    // --- Tính toán Diff Edges ---
    const addedEdges = differenceBy(newEdges, oldEdges, 'id');
    const removedEdges = differenceBy(oldEdges, newEdges, 'id');

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
}));