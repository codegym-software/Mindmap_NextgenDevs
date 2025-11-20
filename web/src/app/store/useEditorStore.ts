import { create } from "zustand";
import { isEqual } from "lodash";

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
  background: string; // Màu nền canvas
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
      'important-light': { fill: "#FBB6CE", color:"#b60ac0ff", stroke: "#ED89A7", textColor: "#ffffffff" },
      strikethrough: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#A0AEC0", textDecoration: "line-through" },
      default: { fill: "#FFFFFF", color:"#ffffffff", stroke: "#CBD5E0", textColor: "#4A5568" },
    },
    root: { fill: "#6366F1", stroke: "#4338CA", textColor: "#FFFFFF" },
  },
};

// ================
// Định nghĩa Types
// ================
export type GlobalStructure = 'mindmap' | 'logic' | 'org';
export type LocalStructure = 'default' | 'logic' | 'org';
export type QuickStyleId = 'default' | 'important-dark' | 'important-light' | 'strikethrough';

/**
 * [CẤU TRÚC NỘI BỘ FE - ĐÃ HỢP NHẤT (MERGED)]
 * Đây là cấu trúc dữ liệu "phẳng" (flat) mà useEditorStore và các
 * component (Editor, FormattingToolbar) sử dụng.
 *
 * - Đã lấy `styleLocked` từ feature/tt.
 * - Đã thêm lại `diamond` và `ellipse` vào `shape` (từ logic cũ của chúng ta).
 */
export type NodeData = {
  id: string;
  nodeText: string; // FE dùng 'nodeText'
  x: number;
  y: number;
  parentId?: string;
  side?: 'left' | 'right';
  collapsed?: boolean;
  quickStyleId?: QuickStyleId;

  // Style thuộc tính (phẳng)
  // [MERGE] Thêm lại 'diamond' và 'ellipse'
  shape?: 'rectangle' | 'roundedRect' | 'diamond' | 'ellipse';
  color?: string; 
  // [MERGE] Thêm 'styleLocked' từ feature/tt
  styleLocked?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  // Text (phẳng)
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'CENTER' | 'right';
  textColor?: string;
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  nodeLength?: 'fit' | number;

  // Branch (Style cho nhánh con) (phẳng)
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
  fontFamily: fonts[0].value, // [MERGE] Lấy font default mới
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'CENTER',
  textColor: '#4A5568',
  textCase: 'normal',
  nodeLength: 230,
  branchColor: undefined,
  branchLineStyle: 'bezier',
  branchLineEnd: 'none',
  branchLineThickness: 'normal',
  localStructure: 'default',
  quickStyleId: 'default',
  styleLocked: false, // [MERGE] Thêm default cho styleLocked
};

/**
 * Tính toán style cuối cùng của một node (Logic không đổi)
 */
export function getNodeComputedStyle(
  node: NodeData | null,
  theme: ColorTheme,
  globalFont: string
): NodeData {
  const baseStyle: Partial<NodeData> = {
    ...DEFAULT_NODE_STYLE,
    fontFamily: globalFont // 1. Áp dụng Global Font
  };

  if (!node) return baseStyle as NodeData;

  // 2. Lấy style từ Theme (Root, QuickStyle, hoặc Default)
  let themeStyle: Partial<ColorThemeStyle> = {};
  if (node.id === 'root') {
    themeStyle = theme.root;
  } else if (node.quickStyleId && theme.quickStyles[node.quickStyleId]) {
    themeStyle = theme.quickStyles[node.quickStyleId];
  } else {
    themeStyle = theme.quickStyles.default;
  }

  // 3. Hợp nhất: Default <- Theme
  const merged: Partial<NodeData> = {
    ...baseStyle,
    ...(themeStyle as Partial<NodeData>),
  };

  // 4. Áp dụng style tùy chỉnh (ghi đè)
  (
    Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>
  ).forEach((key) => {
    if (node[key] !== undefined) {
      (merged as any)[key] = node[key];
    }
  });
  
  // Ghi đè font toàn cục NẾU node có font tùy chỉnh
  if (node.fontFamily) {
    merged.fontFamily = node.fontFamily;
  }

  // Node gốc luôn có style đặc biệt
  if (node.id === 'root') {
    merged.fontSize = (merged.fontSize || 16) + 8;
    merged.fontWeight = 'bold';
    merged.nodeLength = 300;
    merged.textColor = '#480000ff';
    merged.textCase = 'uppercase';
  }

  // Gán lại các thuộc tính không phải style
  merged.id = node.id;
  merged.nodeText = node.nodeText;
  merged.x = node.x;
  merged.y = node.y;
  merged.parentId = node.parentId;
  merged.side = node.side;
  merged.collapsed = node.collapsed;

  return merged as NodeData;
}


// Hàm reset (Logic không đổi)
export function applyNodeDefaults(
  node: NodeData,
  theme: ColorTheme
): Partial<NodeData> {
  const themeStyle =
    node.id === 'root' ? theme.root : theme.quickStyles.default;
  
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
    nodeLength: undefined,
    localStructure: undefined,
    branchColor: undefined,
    branchLineStyle: undefined,
    branchLineEnd: undefined,
    branchLineThickness: undefined,
    styleLocked: undefined, // [MERGE] Thêm reset cho styleLocked
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

  // Cài đặt toàn cục
  globalStructure: GlobalStructure;
  globalFont: string;
  branchLineWidth: number;
  isColoredBranch: boolean;
  activeColorThemeId: string;
  globalBranchColor: string;

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

  // Cài đặt toàn cục
  globalStructure: 'mindmap',
  globalFont: fonts[0].value, // [MERGE] Lấy font default mới
  branchLineWidth: 2,
  isColoredBranch: true,
  activeColorThemeId: 'dawn',
  globalBranchColor: '#94A3B8',

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
      edges: prev.edges
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
      edges: next.edges
    });
    return next;
  },

  clear: () => set({ history: [], future: [] }),
  
  set: (p) => set(p),
}));