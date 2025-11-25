import { create } from "zustand";
import { isEqual } from "lodash";

import { getBranchColorByDepth, getContrastingTextColor } from '../../utils/colorUtils';

// Định nghĩa thêm Palette màu mặc định nếu chưa có
const DEFAULT_PALETTE = [
  '#EF4444', '#F97316', '#FACC15', '#22C55E', 
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
];

// Interface cho thông tin Topo (được tính toán ở Editor)
export type NodeTopology = {
  depth: number;
  branchIndex: number; // Index của nhánh Cấp 1 mà node này thuộc về
};
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
};

export type ColorTheme = {
  background: string; 
  quickStyles: {
    'important-dark': ColorThemeStyle;
    'important-light': ColorThemeStyle;
    strikethrough: ColorThemeStyle;
    default: ColorThemeStyle;
  },
  root: Partial<ColorThemeStyle>; // Style riêng cho node gốc
};

export const colorThemes: Record<string, ColorTheme> = {
  dawn: {
    background: "#ffffffff", 
    quickStyles: {
      'important-dark': { fill: "#420a27ff", color:"#970074ff", stroke: "#97266D", textColor: "#ffffffff", fontSize:18, fontWeight: "bold" },
      'important-light': { fill: "#FBB6CE", color:"#b60ac0ff", stroke: "#ED89A7", textColor: "#ffffffff" }, // SỬA: Đổi mã hex
      strikethrough: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#A0AEC0", textDecoration: "line-through" },
      default: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#4A5568" },
    },
    root: { fill: "#6366F1", stroke: "#4338CA", textColor: "#650505ff" },
  },
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

  // Style thuộc tính (có thể undefined)
  shape?: 'rectangle' | 'roundedRect'; 
  color?: string; 
  hyperlink?: string;
  styleLocked?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  // Text
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  nodeLength?: 'fit' | number;

  // Branch (Style cho nhánh con)
  localStructure?: LocalStructure;
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';
};

export type EdgeData = { id: string; from: string; to: string };

type Snapshot = { nodes: NodeData[]; edges: EdgeData[] };

const MAX_HISTORY = 100;

// =============
// Style Helpers
// =============

// Style mặc định
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
  nodeLength: 'fit', // SỬA: Đổi 230 thành 'fit'
  branchColor: undefined,
  branchLineStyle: 'bezier',
  branchLineEnd: 'none',
  branchLineThickness: 'normal',
  localStructure: 'default',
  quickStyleId: 'default',
};

// Thông tin của người dùng khác đang online
export type PeerState = {
  id: string;
  name: string;
  color: string;
  x: number;     // Tọa độ thực (World position)
  y: number;
  selectedNodeId?: string; // Node họ đang chọn
};

/**
 * Tính toán style cuối cùng của một node
 */
export function getNodeComputedStyle(
  node: NodeData | null,
  theme: ColorTheme,
  globalFont: string,
  topology?: NodeTopology // [MỚI] Tham số topo
): NodeData {
  const baseStyle: Partial<NodeData> = {
    ...DEFAULT_NODE_STYLE,
    fontFamily: globalFont 
  };

  if (!node) return baseStyle as NodeData;

  // 1. Lấy style cơ bản từ Theme
  let themeStyle: Partial<ColorThemeStyle> = {};
  if (node.id === 'root') {
    themeStyle = theme.root;
  } else if (node.quickStyleId && theme.quickStyles[node.quickStyleId]) {
    themeStyle = theme.quickStyles[node.quickStyleId];
  } else {
    themeStyle = theme.quickStyles.default;
  }

  // 2. Hợp nhất
  const merged: Partial<NodeData> = {
    ...baseStyle,
    ...(themeStyle as Partial<NodeData>),
  };

  // 3. [LOGIC MỚI] Áp dụng Smart Color Logic (nếu style chưa bị lock)
  // Chỉ áp dụng nếu có thông tin topology và không phải root
  if (topology && node.id !== 'root' && !node.styleLocked) {
    const { depth, branchIndex } = topology;
    
    // a. Xác định Base Color (Màu gốc của nhánh)
    // Dùng Palette từ theme hoặc mặc định
    // Nếu node có branchColor riêng (do người dùng chỉnh nhánh cha), có thể ưu tiên dùng nó (nâng cao)
    // Ở đây ta dùng Palette xoay vòng theo branchIndex
    const palette = DEFAULT_PALETTE; // Hoặc lấy từ theme.palette nếu có
    const baseHueColor = palette[branchIndex % palette.length];

    // b. Tính toán Lightness và Cutoff theo độ sâu
    const smartColors = getBranchColorByDepth(baseHueColor, depth);

    merged.color = smartColors.bg;
    merged.borderColor = smartColors.border;
    
    // c. Tự động tương phản chữ
    merged.textColor = getContrastingTextColor(smartColors.bg);
    
    // d. Điều chỉnh viền cho các node sâu (Cutoff)
    if (depth >= 6) {
       merged.borderWidth = 2; // Viền dày hơn chút để rõ màu nhánh
    }
  }

  // 4. Áp dụng style tùy chỉnh (ghi đè) từ chính Node (như cũ)
  (Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>).forEach(key => {
    if (node[key] !== undefined) {
      (merged as any)[key] = node[key];
    }
  });

  // Root override (như cũ)
  if (node.id === 'root') {
    merged.fontSize = (merged.fontSize || 16) + 8;
    merged.fontWeight = 'bold';
    merged.nodeLength = 300;
    merged.textColor = '#000000'; 
    merged.textCase = 'uppercase';
  }
  
  // ... Gán lại các thuộc tính khác (id, text, x, y...)
  merged.id = node.id;
  merged.nodeText = node.nodeText;
  merged.x = node.x;
  merged.y = node.y;
  merged.parentId = node.parentId;
  merged.side = node.side;
  merged.collapsed = node.collapsed;
  merged.hyperlink = node.hyperlink;
  merged.styleLocked = node.styleLocked;

  return merged as NodeData;
}


// Hàm reset
export function applyNodeDefaults(node: NodeData, theme: ColorTheme): Partial<NodeData> {
  const themeStyle = (node.id === 'root')
    ? theme.root
    : theme.quickStyles.default;
  
  return {
    ...DEFAULT_NODE_STYLE,
    ...(themeStyle as Partial<NodeData>),
    // Đặt lại các giá trị có thể tùy chỉnh về undefined
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
    nodeLength: undefined, // SỬA: Reset cả nodeLength
    localStructure: undefined,
    branchColor: undefined,
    branchLineStyle: undefined,
    branchLineEnd: undefined,
    branchLineThickness: undefined,
    styleLocked: undefined, // SỬA: Thêm styleLocked
    hyperlink: undefined, // SỬA: Thêm hyperlink
  };
}


// =========
// Định nghĩa State
// =========
type State = {
  nodes: NodeData[];
  edges: EdgeData[];
  history: Snapshot[];
  future: Snapshot[];


  scale: number;
  pos: { x: number; y: number };
  setScale: (v: number) => void;
  setPos: (p: { x: number; y: number }) => void;

  // Cài đặt toàn cục
  globalStructure: GlobalStructure;
  globalFont: string;
  branchLineWidth: number;
  isColoredBranch: boolean;
  activeColorThemeId: string;
  globalBranchColor: string; 
  backgroundColor: string; // [MỚI] Thêm màu nền

  // [MỚI] Quản lý trạng thái editor
  isDirty: boolean; // Theo dõi thay đổi
  currentMindmapId: string | null; // ID của map đang mở
  currentMindmapName: string; // Tên của map đang mở

  peers: Record<string, PeerState>; // Dùng Map object cho nhanh: { "userId1": {x,y...}, "userId2":... }
  updatePeer: (id: string, data: Partial<PeerState>) => void;
  removePeer: (id: string) => void;

  setIsDirty: (isDirty: boolean) => void; 
  setGraph: (n: NodeData[], e: EdgeData[]) => void;
  push: (n: NodeData[], e: EdgeData[]) => void;
  undo: () => Snapshot | null;
  redo: () => Snapshot | null;
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

  setScale: (v) => set({ scale: v }),
  setPos: (p) => set({ pos: p }),


  updatePeer: (id, data) => set((state) => ({
    peers: {
      ...state.peers,
      [id]: { ...(state.peers[id] || {}), ...data, id } // Merge data mới vào cũ
    }
  })),

  removePeer: (id) => set((state) => {
    const newPeers = { ...state.peers };
    delete newPeers[id];
    return { peers: newPeers };
  }),

  // Cài đặt toàn cục
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

  setIsDirty: (status) => set({ isDirty: status }),
  setGraph: (n, e) => {
    set({ nodes: n, edges: e, isDirty: true });
  },

  push: (n, e) => {
    const currentState: Snapshot = { nodes: n, edges: e };
    const lastHistoryState = get().history.at(-1);

    if (!lastHistoryState || !isEqual(lastHistoryState, currentState)) {
      const nextHistory = [...get().history, currentState].slice(-MAX_HISTORY);
      set({ history: nextHistory, future: [], isDirty: true });
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
}));