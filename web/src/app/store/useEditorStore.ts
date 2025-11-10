import { create } from "zustand";
import { isEqual } from "lodash";

// =================================================================================
// Types
// =================================================================================

export type GlobalStructure = 'mindmap' | 'logic' | 'org';
export type QuickStyleId = 'default' | 'important' | 'important-light' | 'strikethrough';

export type NodeData = {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId?: string;
  side?: 'left' | 'right'; // Chỉ dùng cho 'mindmap'
  collapsed?: boolean;
  
  // Thuộc tính Style (có thể undefined)
  shape?: 'rectangle' | 'roundedRect' | 'circle' | 'diamond';
  color?: string; // Fill
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  textCase?: 'normal' | 'uppercase' | 'lowercase';
  // SỬA: Đổi tên 'text' (trùng) thành 'textColor'
  textColor?: string;
  
  nodeLength?: 'fit' | number;

  localStructure?: 'logic' | 'org'; // Cấu trúc riêng của nhánh con
  
  // Style nhánh con
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';
  
  quickStyleId?: QuickStyleId;
};

export type EdgeData = { id: string; from: string; to: string };

type Snapshot = { nodes: NodeData[]; edges: EdgeData[] };

const MAX_HISTORY = 100;

// =================================================================================
// State
// =================================================================================
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
  activeColorThemeId: keyof typeof colorThemes;

  setGraph: (n: NodeData[], e: EdgeData[]) => void;
  push: (n: NodeData[], e: EdgeData[]) => void;
  undo: () => Snapshot | null;
  redo: () => Snapshot | null;
  clear: () => void;
  
  // Setter cho cài đặt toàn cục
  set: (p: Partial<State>) => void;
};

export const useEditorStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],
  
  // Mặc định
  globalStructure: 'mindmap',
  globalFont: 'Inter',
  branchLineWidth: 2,
  isColoredBranch: true,
  activeColorThemeId: 'dawn',

  set: (p) => set(p),

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
}));

// =================================================================================
// Data / Constants
// =================================================================================

// SỬA: Thêm lại các phông chữ
export const fonts = [
  { label: "Inter", value: "Inter" },
  { label: "Roboto", value: "Roboto" },
  { label: "Be Vietnam Pro", value: "Be Vietnam Pro" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Source Sans 3", value: "Source Sans 3" },
  { label: "Lobster", value: "Lobster" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Caveat", value: "Caveat" },
  { label: "Roboto Mono", value: "Roboto Mono" },
];

// SỬA: Đổi 'text' thành 'textColor'
type ColorStyle = { fill: string; stroke: string; textColor: string };
type RootStyle = ColorStyle & { fontWeight: 'bold' };
type StrikethroughStyle = ColorStyle & { textDecoration: 'line-through' };
type ImportantLightStyle = ColorStyle & { fontWeight: 'bold' };

export type ColorTheme = {
  name: string;
  background: string;
  variations: ColorStyle[];
  quickStyles: {
    'default': ColorStyle;
    'important': ColorStyle;
    'important-light': ImportantLightStyle;
    'strikethrough': StrikethroughStyle;
  };
  root: RootStyle;
};

// SỬA: Đổi 'text' thành 'textColor' trong tất cả các theme
export const colorThemes: { [key: string]: ColorTheme } = {
  dawn: {
    name: "Bình minh",
    background: "#FAFAFB", // Nền sáng
    variations: [
      { fill: "#C3D1FF", stroke: "#8DA9FF", textColor: "#002EB3" },
      { fill: "#B5F5D5", stroke: "#7BEAAB", textColor: "#007A3B" },
      { fill: "#FFE0B5", stroke: "#FFC570", textColor: "#AA5F00" },
      { fill: "#FFD1D1", stroke: "#FF9E9E", textColor: "#B31D1D" },
      { fill: "#D1CFFF", stroke: "#A5A3FF", textColor: "#2F2CC4" },
      { fill: "#BDEFFF", stroke: "#87DBFF", textColor: "#006A99" },
    ],
    quickStyles: {
      'default': { fill: "#FFFFFF", stroke: "#E0E0E0", textColor: "#333333" },
      'important': { fill: "#2563EB", stroke: "#1D4ED8", textColor: "#FFFFFF" },
      'important-light': { fill: "#DBEAFE", stroke: "#93C5FD", textColor: "#1E40AF", fontWeight: 'bold' },
      'strikethrough': { fill: "#F1F5F9", stroke: "#CBD5E1", textColor: "#64748B", textDecoration: 'line-through' },
    },
    root: { fill: "#3B82F6", stroke: "#1D4ED8", textColor: "#FFFFFF", fontWeight: 'bold' },
  },
  ocean: {
    name: "Đại dương",
    background: "#F0F9FF",
    variations: [
      { fill: "#B3E0FF", stroke: "#80CFFF", textColor: "#005A9E" },
      { fill: "#B8F5E1", stroke: "#7FF0C9", textColor: "#007A52" },
      { fill: "#FFEBB5", stroke: "#FFDA70", textColor: "#AA7B00" },
      { fill: "#FFDBCF", stroke: "#FFB89E", textColor: "#B34A24" },
      { fill: "#DBCFFF", stroke: "#B8A3FF", textColor: "#4C2CC4" },
      { fill: "#CFF5FF", stroke: "#A3E9FF", textColor: "#007499" },
    ],
    quickStyles: {
      'default': { fill: "#FFFFFF", stroke: "#E0E0E0", textColor: "#333333" },
      'important': { fill: "#0A659E", stroke: "#074B75", textColor: "#FFFFFF" },
      'important-light': { fill: "#E0F2FE", stroke: "#7DD3FC", textColor: "#0C4A6E", fontWeight: 'bold' },
      'strikethrough': { fill: "#F1F5F9", stroke: "#CBD5E1", textColor: "#64748B", textDecoration: 'line-through' },
    },
    root: { fill: "#0B5C8F", stroke: "#074B75", textColor: "#FFFFFF", fontWeight: 'bold' },
  },
};

// =================================================================================
// Style Helpers
// =================================================================================
// SỬA: Thêm 'textColor'
export const DEFAULT_NODE_STYLE: Partial<NodeData> = {
  shape: 'roundedRect',
  color: '#FFFFFF',
  borderColor: '#E0E0E0',
  borderWidth: 2,
  borderStyle: 'solid',
  fontFamily: fonts[0].value,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  textCase: 'normal',
  textColor: '#333333', // Thêm màu text mặc định
  nodeLength: 'fit',
  branchColor: '#B0B0B0',
  branchLineStyle: 'bezier',
  branchLineEnd: 'none',
  branchLineThickness: 'normal',
  localStructure: undefined,
  quickStyleId: 'default',
};

/**
 * Hàm Helper để tính toán style cuối cùng của một node
 */
export function getNodeComputedStyle(node: NodeData | null, theme: ColorTheme, globalFont: string): NodeData {
  if (!node) return { ...DEFAULT_NODE_STYLE, fontFamily: globalFont } as NodeData;

  // 1. Bắt đầu với Mặc định + Font Toàn cục
  const baseStyle: Partial<NodeData> = { ...DEFAULT_NODE_STYLE, fontFamily: globalFont };

  // 2. Áp dụng kiểu từ Theme
  let themeStyle: Partial<NodeData> = {};
  if (node.id === 'root') {
    themeStyle = theme.root as Partial<NodeData>;
  } else if (node.quickStyleId && theme.quickStyles[node.quickStyleId as keyof typeof theme.quickStyles]) { // Sửa: Thêm check an toàn
    themeStyle = theme.quickStyles[node.quickStyleId as keyof typeof theme.quickStyles] as Partial<NodeData>;
  } else {
    themeStyle = theme.quickStyles.default as Partial<NodeData>;
  }

  // 3. Hợp nhất: Mặc định <- Theme <- Node (ghi đè)
  const merged: Partial<NodeData> = {
    ...baseStyle,
    ...themeStyle,
  };

  // 4. Chỉ ghi đè các giá trị đã được xác định cụ thể trên node
  (Object.keys(DEFAULT_NODE_STYLE) as Array<keyof NodeData>).forEach(key => {
    if (node[key] !== undefined) {
      (merged as any)[key] = node[key];
    }
  });

  // 5. Node gốc luôn có style đặc biệt
  if (node.id === 'root') {
    merged.fontSize = (merged.fontSize || 16) + 4; // To hơn
    merged.fontWeight = 'bold'; // Luôn đậm
  }

  return { ...node, ...merged } as NodeData;
}

// Hàm reset
export function applyNodeDefaults(node: NodeData, theme: ColorTheme): Partial<NodeData> {
  const baseStyle = { ...DEFAULT_NODE_STYLE };
  const themeStyle = (node.id === 'root')
    ? theme.root
    : theme.quickStyles.default;
  
  return {
    ...baseStyle,
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
    textCase: undefined,
    textColor: undefined, // Sửa: Thêm textColor
    nodeLength: undefined,
    localStructure: undefined,
    branchColor: undefined,
    branchLineStyle: undefined,
    branchLineEnd: undefined,
    branchLineThickness: undefined,
  };
}

