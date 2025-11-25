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

  // Branch
  localStructure?: LocalStructure;
  branchColor?: string;
  branchLineStyle?: 'bezier' | 'sharp';
  branchLineEnd?: 'none' | 'arrow';
  branchLineThickness?: 'thin' | 'normal' | 'thick';
  boundary?: boolean;
};

export type EdgeData = { id: string; from: string; to: string };

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
  textAlign: 'center',
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

  if (topology) {
    const { depth, branchBaseColor } = topology;

    if (node.id === 'root') {
       baseStyle.color = theme.root.fill || '#000000';
       baseStyle.textColor = theme.root.textColor || '#FFFFFF';
       baseStyle.borderColor = theme.root.stroke || '#000000';
       baseStyle.borderWidth = 4;
       baseStyle.fontSize = 28;
       baseStyle.fontWeight = 'bold';
       baseStyle.textCase = 'uppercase';
    } else {
       const smartColors = getBranchColorByDepth(branchBaseColor, depth);
       
       baseStyle.color = smartColors.bg;
       baseStyle.borderColor = smartColors.border;
       baseStyle.textColor = getContrastingTextColor(smartColors.bg);
       
       if (depth >= 6) baseStyle.borderWidth = 2;
    }
  }

  // 3. [QUICK STYLE]
  if (node.quickStyleId && node.quickStyleId !== 'default' && theme.quickStyles[node.quickStyleId]) {
    const qs = theme.quickStyles[node.quickStyleId];
    baseStyle.color = qs.fill;
    baseStyle.borderColor = qs.stroke;
    baseStyle.textColor = qs.textColor;
    if (qs.fontWeight) baseStyle.fontWeight = qs.fontWeight;
    if (qs.textDecoration) baseStyle.textDecoration = qs.textDecoration;
    if (qs.fontSize) baseStyle.fontSize = qs.fontSize;
    if (qs.textcase) baseStyle.textCase = qs.textcase;
  }

  // 4. [OVERRIDE]
  const computed: Partial<NodeData> = { ...baseStyle };
  const OVERRIDABLE_KEYS: (keyof NodeData)[] = [
    'shape', 'color', 'borderColor', 'borderWidth', 'borderStyle',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 
    'textAlign', 'textColor', 'textCase', 'nodeLength',
    'branchLineStyle', 'branchLineEnd', 'branchLineThickness'
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

  // [ĐỒNG BỘ MÀU DÂY]
  computed.branchColor = node.branchColor ?? (topology ? topology.branchBaseColor : undefined);

  if (node.fontFamily) {
    computed.fontFamily = node.fontFamily;
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
};

export const useEditorStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
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
}));