import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stage,
  Layer,
  Group,
  Rect,
  Text,
  Line,
  Circle,
  Path,
  Arrow,
} from 'react-konva';
import * as dagre from 'dagre';
import { useDebouncedCallback } from 'use-debounce';
import EditorToolbar from '../features/editor/EditorToolbar';
import Sidebar from '../components/layout/Sidebar';
import FormattingToolbar from '../features/editor/FormattingToolbar';
import {
  useEditorStore,
  NodeData,
  EdgeData,
  GlobalStructure,
  QuickStyleId,
  ColorTheme,
  colorThemes,
  fonts,
  getNodeComputedStyle,
  applyNodeDefaults,
  DEFAULT_NODE_STYLE,
  NodeData as FeNodeData, 
} from '../app/store/useEditorStore';
import { mindmapsApi, FeMindmapDoc } from '../services/mindmapsApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import Spinner from '../components/common/Spinner';
import { useLocalMindmap } from '../hooks/useLocalMindmap';
import { useMindmapsStore } from '../app/store/useMindmapsStore';

import {
  BeMindmapContent,
  BeMindmapDoc,
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
} from '../services/dataMapper';

type BroadcastPatch = {
  type: string;
  payload: any; // Dữ liệu là JSON, do FE gửi và FE nhận
  senderId: string;
};
type BeGuestDoc = {
  id: string;
  name: string;
  content: BeMindmapContent;
};
// =================================================================================

const GUEST_BUCKET = 'mm_guest_docs';

const PADDING_X = 20,
  PADDING_Y = 12;
const LINE_HEIGHT_MULTIPLIER = 1.3;

// [MERGE] Giữ lại logic UI mới (branch colors) từ feature/tt
const BRANCH_COLORS_PALETTE = [
  '#EF4444', '#F97316', '#FACC15', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function mixWithWhite(hex: string, amount = 0.85) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return rgbToHex(nr, ng, nb);
}

function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#FFFFFF';
}

// =================================================================================
// Component
// =================================================================================

/**
 * [MERGE GĐ 3] Cấy ghép hàm loadGuestDoc (đã sửa)
 * Đọc chuẩn BE, dịch sang FE
 */
export function loadGuestDoc(id: string): FeMindmapDoc | null {
  try {
    const raw = localStorage.getItem(GUEST_BUCKET);
    if (!raw) return null;
    const allDocs = JSON.parse(raw);
    const beDoc: BeGuestDoc = allDocs[id];
    if (!beDoc) return null;
    const feContent = normalizeContentBEtoFE(beDoc.content);
    return {
      id: beDoc.id,
      name: beDoc.name,
      ...feContent,
      ownerId: 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    };
  } catch (e) {
    console.error('Error loading guest doc:', e);
    return null;
  }
}

/**
 * [MERGE GĐ 3] Cấy ghép hàm saveGuestDoc (đã sửa)
 * Nhận chuẩn FE, dịch sang BE
 */
function saveGuestDoc(
  id: string,
  name: string,
  feNodes: FeNodeData[],
  feEdges: EdgeData[]
) {
  try {
    const beContent = normalizeContentFEtoBE(feNodes, feEdges);
    const all = JSON.parse(localStorage.getItem(GUEST_BUCKET) || '{}');
    const beDoc: BeGuestDoc = { id: id, name: name, content: beContent };
    all[id] = beDoc;
    localStorage.setItem(GUEST_BUCKET, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving guest doc:', e);
  }
}

/**
 * [MERGE] Giữ lại hàm calculateNodeBox từ feature/tt
 * (Đây là logic layout/UI)
 */
function calculateNodeBox(node: NodeData, style: NodeData) {
  const { fontSize, nodeLength, nodeText, textCase, shape } = style;
  const borderWidth = style.borderWidth || 0;
  let processedText = nodeText || '';
  if (textCase === 'uppercase') processedText = processedText.toUpperCase();
  if (textCase === 'lowercase') processedText = processedText.toLowerCase();
  const finalFontSize = fontSize || 14;
  const finalLineHeight = finalFontSize * LINE_HEIGHT_MULTIPLIER;
  let w: number;
  let wrappedLines: string[] = [];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) {
    context.font = `${finalFontSize}px ${style.fontFamily || 'Inter'}`;
  }
  const measureWidth = (text: string) =>
    context?.measureText(text).width || text.length * finalFontSize * 0.6;
  if (nodeLength === 'fit') {
    let maxWidth = 0;
    processedText.split('\n').forEach((line: string) => {
      maxWidth = Math.max(maxWidth, measureWidth(line));
    });
    w = maxWidth + PADDING_X * 2 + borderWidth * 2;
    w = Math.max(w, 80);
    wrappedLines = processedText.split('\n');
  } else {
    w = Number(nodeLength) || 150;
    const contentWidth = w - PADDING_X * 2 - borderWidth * 2;
    const lines = processedText.split('\n');
    lines.forEach((line: string) => {
      if (line.length === 0) {
        wrappedLines.push('');
        return;
      }
      let currentLine = '';
      const words = line.split(' ');
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = measureWidth(testLine);
        if (testWidth > contentWidth) {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
          while (measureWidth(currentLine) > contentWidth) {
            wrappedLines.push(currentLine.substring(0, 20));
            currentLine = currentLine.substring(20);
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) wrappedLines.push(currentLine);
    });
  }
  let h = Math.max(
    finalLineHeight + PADDING_Y * 2,
    wrappedLines.length * finalLineHeight + PADDING_Y * 2
  );

  return { w, h, textToRender: wrappedLines.join('\n'), finalFontSize };
}

export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { toggleTheme } = useTheme();
  const { isAuthed, login, getAccessToken } = useAuth();
  const { createGuest } = useLocalMindmap();
  const isGuest = !!id && id.startsWith('guest-');

  // State từ store 
  const {
    nodes,
    edges,
    setGraph,
    push: pushHistory,
    undo,
    redo,
    clear: clearHistory,
    globalStructure,
    globalFont,
    branchLineWidth,
    isColoredBranch,
    activeColorThemeId,
    set: setGlobalStore,
    globalBranchColor,
    isDirty
  } = useEditorStore();

  // State nội bộ (Lấy từ feature/tt, bao gồm logic UI mới)
  const [name, setName] = useState('Loading...');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFormattingToolbarOpen, setFormattingToolbarOpen] = useState(false); // UI Mới
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 48,
  });
  const [pos, setPos] = useState({
    x: window.innerWidth / 2,
    y: (window.innerHeight - 48) / 2, 
  });
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['root']);
  const [isPanning, setIsPanning] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dragStartState, setDragStartState] = useState<{
    nodes: NodeData[];
    edges: EdgeData[];
  } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#FAFAFB');
  const [styleClipboard, setStyleClipboard] = useState<Partial<NodeData> | null>(
    null
  );
  const [rootCollapse, setRootCollapse] = useState({ left: false, right: false });
  const lastEditStopTime = useRef(0);

  const stageRef = useRef<any>(null);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const activeTheme =
  colorThemes[activeColorThemeId as keyof typeof colorThemes];
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const nodesWithChildren = useMemo(
    () => new Set(edges.map((e) => e.from)),
    [edges]
  );
  const [selectionRect, setSelectionRect] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });
  const selectionStartPos = useRef({ x: 0, y: 0 });
  const isSelecting = useRef(false); // Thêm cờ này để biết đang kéo chọn vùng

  const selectedIdsSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  // Lấy node đầu tiên trong danh sách chọn để hiển thị style trên toolbar
  const firstSelectedId = useMemo(() => selectedNodeIds[0], [selectedNodeIds]);
  const currentNode = useMemo(() => {
    if (!firstSelectedId) return null;
    return nodeMap.get(firstSelectedId) || null;
  }, [firstSelectedId, nodeMap]);

  const setMindmapsStore = useMindmapsStore(s => s.set);
  const mindmapItems = useMindmapsStore(s => s.items);

  // Logic tính toán (Không thay đổi)
  const computedNodeStyles = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((node) => {
      map.set(node.id, getNodeComputedStyle(node, activeTheme, globalFont));
    });
    return map;
  }, [nodes, activeTheme, globalFont]);

  const nodeVisuals = useMemo(() => {
    const map = new Map<
      string,
      { style: NodeData; box: ReturnType<typeof calculateNodeBox> }
    >();
    for (const node of nodes) {
      const style = computedNodeStyles.get(node.id);
      if (style) {
        const box = calculateNodeBox(node, style);
        map.set(node.id, { style, box });
      }
    }
    return map;
  }, [nodes, computedNodeStyles]);

  // [MERGE] Logic UI mới từ feature/tt (rootChildSides)
  const rootChildSides = useMemo(() => {
    const sides = { left: false, right: false };
    if (!nodesWithChildren.has('root')) return sides;
    for (const edge of edges) {
      if (edge.from === 'root') {
        const child = nodeMap.get(edge.to);
        if (child?.side === 'left') sides.left = true;
        if (child?.side === 'right' || !child?.side) sides.right = true;
      }
      if (sides.left && sides.right) break;
    }
    return sides;
  }, [edges, nodeMap, nodesWithChildren]);

  // ==========================================================
  // [MERGE GĐ 7] CẤY GHÉP LOGIC DEBOUNCE (Undo/Save)
  // ==========================================================

  // 1. Luồng Undo/Redo (0.5s)
  const debouncedPushHistory = useDebouncedCallback(() => {
    const { nodes, edges } = useEditorStore.getState();
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
    // console.log("v0.5: Đã lưu vào Undo stack");
  }, 500);

  // 2. Luồng Lưu trữ (5s)
  const debouncedPersistData = useDebouncedCallback(() => {
    if (!isDataLoaded || !id) return;
    const { nodes: currentNodes, edges: currentEdges } =
      useEditorStore.getState();

    if (isGuest) {
      saveGuestDoc(id, name, currentNodes, currentEdges);
    } else if (isAuthed) {
      const docToSave = {
        name,
        content: { nodes: currentNodes, edges: currentEdges },
      };
      mindmapsApi.update(id, docToSave).catch((e) => {
        console.error('Lưu trữ (persist) ngầm thất bại:', e);
      });
    }
  }, 5000, {
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 48, 
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsDataLoaded(false);
      if (!id) {
        if (isAuthed) {
          navigate('/dashboard', { replace: true });
          return;
        }
        const newGuest = createGuest();
        if (isMounted) navigate(`/editor/${newGuest.id}`, { replace: true });
        return;
      }

      try {
        let data: FeMindmapDoc | null = null;
        const tempGuestData = sessionStorage.getItem('temp_mindmap_guest');
        const tempAuthedData = sessionStorage.getItem('temp_mindmap');

        if (isGuest && tempGuestData) {
          data = JSON.parse(tempGuestData) as FeMindmapDoc;
          sessionStorage.removeItem('temp_mindmap_guest');
        } else if (isAuthed && tempAuthedData) {
          const beDoc: BeMindmapDoc = JSON.parse(tempAuthedData);
          const feContent = normalizeContentBEtoFE(beDoc.content);
          data = { ...beDoc, ...feContent };
          sessionStorage.removeItem('temp_mindmap');
        } else {
          if (isGuest) {
            data = loadGuestDoc(id);
            if (!data) throw new Error('Không tìm thấy Guest mindmap');
          } else {
            if (!isAuthed)
              addToast('Vui lòng đăng nhập để xem mindmap này.', 'info');
            data = await mindmapsApi.get(id);
          }
        }

        if (isMounted) {
          setName(data.name);
          useEditorStore.setState({ currentMindmapId: id, currentMindmapName: data.name, isDirty: false });
          clearHistory();
          setGraph(data.nodes, data.edges);
          pushHistory(data.nodes, data.edges); 
          setGlobalStore({
            globalStructure: (data.layoutMode as GlobalStructure) || 'mindmap',
            globalFont: data.fontFamily || fonts[0].value,
            branchLineWidth: data.branchLineWidth || 2,
            isColoredBranch: data.isColoredBranch ?? true,
            globalBranchColor: data.globalBranchColor || '#94A3B8',
            activeColorThemeId: data.activeColorThemeId || 'dawn',
            backgroundColor: data.backgroundColor || '#FAFAFB', 
          });
          setBackgroundColor(data.backgroundColor || '#FAFAFB');
          setSelectedNodeIds(['root']);
          setIsDataLoaded(true);
        }
      } catch (error) {
        if (isMounted) {
          addToast('Không thể tải mindmap!', 'error');
          navigate('/dashboard', { replace: true });
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [
    id, isAuthed, navigate, addToast, clearHistory,
    setGraph, pushHistory, activeColorThemeId, setGlobalStore,
    isGuest, createGuest,
  ]);

  const handleSave = () => {
    if (!isAuthed) {
      addToast('Vui lòng đăng nhập để lưu mindmap.', 'info');
      login();
    } else if (id) {
      const content = { nodes: nodes, edges };
      mindmapsApi
        .update(id, { name, content })
        .then(() => {
          addToast('Đã lưu mindmap!', 'success');
          useEditorStore.setState({ isDirty: false });
          const newItems = mindmapItems.map(item => 
             item.id === id ? { ...item, name: name } : item
          );
          setMindmapsStore({ items: newItems });
        })
        .catch((e) => {
          console.error('Save failed:', e);
          addToast('Lưu thất bại', 'error');
        });
    }
  };

  useEffect(() => {
    if (selectedNodeIds.length > 0) {
       setFormattingToolbarOpen(true);
    }
  }, [selectedNodeIds]);

  const handleCreateNew = useCallback(async () => {
    try {
      if (isAuthed) {
        const createdDoc: BeMindmapDoc = await mindmapsApi.createAndOpen();
        sessionStorage.setItem('temp_mindmap', JSON.stringify(createdDoc));
        window.location.href = `/editor/${createdDoc.id}`;
      } else {
        const g = createGuest();
        const guestDoc = loadGuestDoc(g.id);
        sessionStorage.setItem('temp_mindmap_guest', JSON.stringify(guestDoc));
        window.location.href = `/editor/${g.id}`;
      }
    } catch (e) {
      console.error('Failed to create mindmap:', e);
      addToast('Không thể tạo mindmap mới', 'error');
    }
  }, [isAuthed, createGuest, addToast]);

  useEffect(() => {
    const createHandler = () => handleCreateNew();
    window.addEventListener('mm:create', createHandler);
    return () => window.removeEventListener('mm:create', createHandler);
  }, [handleCreateNew]);

  // 1. Hàm Gửi Patch
  const sendPatch = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type, payload }));
      } catch (e) {
        console.error('Lỗi khi gửi WebSocket patch:', e);
      }
    }
  }, []);

  // 2. Hook Kết nối và Nhận Patch
  useEffect(() => {
    if (!id || !isAuthed || isGuest || !isDataLoaded) {
      return; // Chỉ user đăng nhập & không phải Guest mới kết nối WS
    }

    let isConnecting = true;
    let isMounted = true; // Cờ cleanup

    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !isMounted) return;

        // TODO: Thay 'localhost:8081' bằng biến VITE_WS_URL
        const wsUrl = `ws://localhost:8081/ws/mindmap/${id}?token=${token}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        isConnecting = false;

        ws.onopen = () => console.log(`WebSocket connected to mindmap: ${id}`);
        ws.onclose = () => {
          console.log(`WebSocket disconnected from mindmap: ${id}`);
          wsRef.current = null;
        };
        ws.onerror = (err) => console.error('WebSocket error:', err);

        // === [GĐ 9] LOGIC NHẬN PATCH ===
        ws.onmessage = (event) => {
          try {
            const message: BroadcastPatch = JSON.parse(event.data);
            const { type, payload } = message;

            // Lấy state MỚI NHẤT từ store (RẤT QUAN TRỌNG)
            const { nodes: currentNodes, edges: currentEdges } =
              useEditorStore.getState();

            // QUAN TRỌNG: Chỉ gọi setGraph, KHÔNG gọi debouncedPushHistory

            switch (type) {
              case 'USER_JOINED':
                addToast(`User ${payload.userId.substring(0, 6)}... đã tham gia.`, 'info');
                break;
              case 'USER_LEFT':
                addToast(`User ${payload.userId.substring(0, 6)}... đã rời đi.`, 'info');
                break;
              
              case 'NODE_MOVE': {
                const { id: nodeId, x, y } = payload;
                const newNodes = currentNodes.map((n) =>
                   n.id === nodeId ? { ...n, x, y } : n
                );
                setGraph(newNodes, currentEdges);
                break;
              }
              case 'NODE_TEXT_CHANGE': {
                const { id: nodeId, text } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, nodeText: text } : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_CREATE': {
                const { node: feNode, edge: feEdge } = payload;
                setGraph([...currentNodes, feNode], [...currentEdges, feEdge]);
                setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_DELETE': {
                const { nodeIds } = payload;
                const set = new Set(nodeIds as string[]);
                const newNodes = currentNodes.filter((n) => !set.has(n.id));
                const newEdges = currentEdges.filter(
                  (e) => !set.has(e.from) && !set.has(e.to)
                );
                setGraph(newNodes, newEdges);
                setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_REPARENT': {
                const { nodeId, newParentId, x, y, side } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId
                    ? { ...n, parentId: newParentId, x, y, side }
                    : n
                );
                const oldEdge = currentEdges.find((e) => e.to === nodeId);
                let newEdges: EdgeData[];
                if (oldEdge) {
                  newEdges = currentEdges.map((e) =>
                    e.id === oldEdge.id ? { ...e, from: newParentId } : e
                  );
                } else {
                  newEdges = [
                    ...currentEdges,
                    { id: `e-${nodeId}`, from: newParentId, to: nodeId },
                  ];
                }
                setGraph(newNodes, newEdges);
               setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_STYLE_UPDATE': {
                const { id: nodeId, updates } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...updates } : n
                );
                setGraph(newNodes, currentEdges);
                if (updates.nodeLength) setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_QUICK_STYLE_APPLY': {
              const { id: nodeId, styleId, resetStyle } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId
                    ? { ...n, ...resetStyle, quickStyleId: styleId }
                    : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_STYLE_PASTE': {
               const { id: nodeId, style } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...style } : n
                );
                setGraph(newNodes, currentEdges);
               setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_STYLE_RESET': {
                const { id: nodeId, resetStyle } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...resetStyle } : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => handleLayout(true), 0);
                break;
              }
              case 'NODE_TOGGLE_COLLAPSE': {
                const { id: nodeId } = payload;
                const newNodes = currentNodes.map(n => 
                  n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
                );
                setGraph(newNodes, currentEdges);
               break;
              }
              case 'ROOT_TOGGLE_COLLAPSE': {
                const { side } = payload;
                // [FIX TS ERROR] Thêm type guard
                if (side === 'left' || side === 'right') {
               setRootCollapse(prev => ({ ...prev, [side as 'left' | 'right']: !prev[side as 'left' | 'right'] }));
                } else {
                  console.warn(`Invalid side received in ROOT_TOGGLE_COLLAPSE: ${side}`);
                }
                break;
              }
              default:
                console.warn('Unknown WebSocket patch type:', type);
            }
          } catch (e) {
            console.error('Lỗi khi xử lý tin nhắn WebSocket:', e);
         }
        };
      } catch (err) {
        console.error("Không thể lấy access token cho WebSocket:", err);
        addToast("Lỗi xác thực WebSocket.", "error");
      }
    };

    connect();

    // Hàm cleanup
    return () => {
      isMounted = false;
      if (wsRef.current && !isConnecting) {
       console.log('Closing WebSocket connection...');
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [id, isAuthed, isGuest, isDataLoaded, getAccessToken, addToast, setGraph]);
  // (Bỏ pushHistory khỏi deps)

  // ================================================
  // Style & Layout Logic
  // [MERGE] Giữ nguyên logic 5 bước của feature/tt
  // ================================================

  

  const handleLayout = useCallback(
    (keepCamera: boolean = false) => {
      const { globalStructure, nodes, edges } = useEditorStore.getState();
      const layoutType = globalStructure;

      let newNodes: NodeData[] = [...nodes];

      if (layoutType === 'mindmap') {
        const HORIZONTAL_GAP = 120;
        const VERTICAL_GAP = 20;
        const ROOT_X = 0;
        const ROOT_Y = 0;
        const treeMap = new Map<string, TreeNode>();
        type TreeNode = NodeData & {
          children: TreeNode[];
          subtreeHeight: number;
        };
        const buildTree = (): TreeNode | null => {
          let root: TreeNode | null = null;
          nodes.forEach((node) => {
            treeMap.set(node.id, { ...node, children: [], subtreeHeight: 0 });
       });
          edges.forEach((edge) => {
            const parent = treeMap.get(edge.from);
            const child = treeMap.get(edge.to);
            if (parent && child) {
              parent.children.push(child);
            }
          });
          const rootNode = treeMap.get('root');
          if (rootNode) root = rootNode;
          return root;
        };
        const calculateSubtreeHeights = (node: TreeNode): number => {
          const visual = nodeVisuals.get(node.id);
          const selfHeight = visual?.box.h || 60;
          if (node.children.length === 0) {
            node.subtreeHeight = selfHeight;
            return selfHeight;
          }
          let childrenTotalHeight = 0;
          node.children.forEach((child, index) => {
            childrenTotalHeight += calculateSubtreeHeights(child);
            if (index > 0) {
              childrenTotalHeight += VERTICAL_GAP;
            }
          });
          node.subtreeHeight = Math.max(selfHeight, childrenTotalHeight);
          return node.subtreeHeight;
        };
        const positionBranch = (
          branchNodes: TreeNode[],
          parent: TreeNode,
          side: 'left' | 'right'
        ) => {
          const totalHeight = branchNodes.reduce((sum, node, index) => {
            return sum + node.subtreeHeight + (index > 0 ? VERTICAL_GAP : 0);
          }, 0);
          let currentY = parent.y - totalHeight / 2;
          const direction = side === 'left' ? -1 : 1;
          branchNodes.forEach((node) => {
            const blockHeight = node.subtreeHeight;
            const nodeVisual = nodeVisuals.get(node.id);
            const nodeWidth = nodeVisual?.box.w || 150;
            const parentVisual = nodeVisuals.get(parent.id);
            const parentWidth = parentVisual?.box.w || 150;
            node.x =
              parent.x +
              direction * (HORIZONTAL_GAP + parentWidth / 2 + nodeWidth / 2);
            node.y = currentY + blockHeight / 2;
            node.side = side;
            currentY += blockHeight + VERTICAL_GAP;
            if (node.children.length > 0) {
              positionChildrenVertically(node.children, node, side);
            }
          });
        };
        const positionChildrenVertically = (
          children: TreeNode[],
          parent: TreeNode,
          side: 'left' | 'right'
        ) => {
          const totalHeight = children.reduce((sum, node, index) => {
            return sum + node.subtreeHeight + (index > 0 ? VERTICAL_GAP : 0);
          }, 0);
          let currentY = parent.y - totalHeight / 2;
          const direction = side === 'left' ? -1 : 1;
          children.forEach((node) => {
            const blockHeight = node.subtreeHeight;
            const nodeVisual = nodeVisuals.get(node.id);
            const nodeWidth = nodeVisual?.box.w || 150;
            const parentVisual = nodeVisuals.get(parent.id);
            const parentWidth = parentVisual?.box.w || 150;
            node.x =
              parent.x +
              direction *
                (HORIZONTAL_GAP / 1.5 + parentWidth / 2 + nodeWidth / 2);
            node.y = currentY + blockHeight / 2;
            node.side = side;
            currentY += blockHeight + VERTICAL_GAP;
            if (node.children.length > 0) {
              positionChildrenVertically(node.children, node, side);
            }
          });
        };
        const rootNode = buildTree();
        if (rootNode) {
          calculateSubtreeHeights(rootNode);
          rootNode.x = ROOT_X;
          rootNode.y = ROOT_Y;
          rootNode.side = 'right';
          const rightGroup: TreeNode[] = [];
          const leftGroup: TreeNode[] = [];
          let rightHeight = 0;
          let leftHeight = 0;
          const sortedRootChildren = [...rootNode.children].sort(
            (a, b) => b.subtreeHeight - a.subtreeHeight
          );
          sortedRootChildren.forEach((child) => {
            const childBlockHeight = child.subtreeHeight;
            if (rightHeight <= leftHeight) {
              rightGroup.push(child);
              rightHeight += childBlockHeight + (rightGroup.length > 1 ? VERTICAL_GAP : 0);
            } else {
              leftGroup.push(child);
              leftHeight += childBlockHeight + (leftGroup.length > 1 ? VERTICAL_GAP : 0);
            }
          });
          positionBranch(rightGroup, rootNode, 'right');
          positionBranch(leftGroup, rootNode, 'left');
          newNodes = Array.from(treeMap.values()).map((node) => {
            const { children, subtreeHeight, ...rest } = node;
            return rest;
          });
        }
      } else {
        // Logic Dagre cho 'org' và 'logic'
        const g = new dagre.graphlib.Graph();
        const rankdir = layoutType === 'org' ? 'TB' : 'LR';
        g.setGraph({ rankdir: rankdir, nodesep: 50, ranksep: 120 });
        g.setDefaultEdgeLabel(() => ({}));
        const adjMap = new Map<string, string[]>();
        edges.forEach((e) => {
          if (!adjMap.has(e.from)) adjMap.set(e.from, []);
          adjMap.get(e.from)!.push(e.to);
        });
        nodes.forEach((node) => {
          const visual = nodeVisuals.get(node.id);
         let w = visual?.box.w || 100;
          let h = visual?.box.h || 50;
          if (layoutType === 'logic') {
            const children = adjMap.get(node.id) || [];
            if (children.length > 0) {
              let childrenHeight = 0;
              children.forEach((childId, idx) => {
                childrenHeight += nodeVisuals.get(childId)?.box.h || 50;
                if (idx > 0) childrenHeight += 30;
              });
              h = Math.max(h, childrenHeight);
            }
          }
          if (layoutType === 'org') {
            const children = adjMap.get(node.id) || [];
            if (children.length > 0) {
              let childrenWidth = 0;
              children.forEach((childId, idx) => {
                childrenWidth += nodeVisuals.get(childId)?.box.w || 100;
                if (idx > 0) childrenWidth += 30;
              });
              w = Math.max(w, childrenWidth);
         }
          }
          g.setNode(node.id, { label: node.nodeText, width: w, height: h });
        });
        edges.forEach((edge) => g.setEdge(edge.from, edge.to));
        dagre.layout(g);
        newNodes = nodes.map((n): NodeData => {
          const pos = g.node(n.id);
          const side =
            layoutType === 'org' ? 'right' : pos.x < 0 ? 'left' : 'right';
          return pos ? { ...n, x: pos.x, y: pos.y, side: side } : n;
        });
      }

      const finalNodesMap = new Map(newNodes.map(n => [n.id, n]));
      const allEdges = useEditorStore.getState().edges;

      // 2. Tìm tất cả các node gốc (không có cha) NGOẠI TRỪ 'root'
      const floatingRoots = newNodes.filter(
        n => (n.parentId === undefined || n.parentId === null) && n.id !== 'root'
      );

      // 3. Tạo một map các cạnh để tìm con (chỉ cần làm 1 lần)
      const adjMap = new Map<string, string[]>();
      allEdges.forEach(e => {
        if (!adjMap.has(e.from)) adjMap.set(e.from, []);
        adjMap.get(e.from)!.push(e.to);
      });

      // 4. Duyệt qua từng "đảo"
      for (const floatingRoot of floatingRoots) {
        const islandNodes = new Map<string, NodeData>();
        const islandEdges: EdgeData[] = [];
        const q: NodeData[] = [floatingRoot]; // Hàng đợi cho BFS

        // 5. Tìm tất cả con cháu của đảo này (BFS)
        while (q.length > 0) {
          const current = q.shift()!;
          if (!islandNodes.has(current.id)) {
            islandNodes.set(current.id, current);
            
            const childrenIds = adjMap.get(current.id) || [];
            childrenIds.forEach(childId => {
              // Lấy node từ map (đã được layout chính cập nhật)
              const childNode = finalNodesMap.get(childId); 
              if (childNode) {
                q.push(childNode);
                islandEdges.push({ id: `e-${childId}`, from: current.id, to: childId });
              }
            });
          }
        }

        if (islandNodes.size <= 1) continue; // Không có con, bỏ qua

        // 6. Tạo 1 graph Dagre *riêng* cho hòn đảo này
        const g = new dagre.graphlib.Graph();
        const islandLayoutDir = 'LR';
        g.setGraph({ rankdir: islandLayoutDir, nodesep: 50, ranksep: 100 });
        g.setDefaultEdgeLabel(() => ({}));

        islandNodes.forEach((node) => {
          const visual = nodeVisuals.get(node.id);
          g.setNode(node.id, {
            label: node.nodeText,
            width: visual?.box.w || 100,
            height: visual?.box.h || 50
          });
        });
        islandEdges.forEach((edge) => g.setEdge(edge.from, edge.to));
        
        // 7. Chạy layout cục bộ
        dagre.layout(g);

        // 8. Tính toán độ dời (offset)
        // Vị trí "neo" là vị trí hiện tại của node nổi (do người dùng kéo)
        const anchorPos = finalNodesMap.get(floatingRoot.id)!; 
        const dagreRootPos = g.node(floatingRoot.id);
        const offsetX = anchorPos.x - dagreRootPos.x;
        const offsetY = anchorPos.y - dagreRootPos.y;

        // 9. Áp dụng vị trí mới (đã dời) cho tất cả con cháu
        islandNodes.forEach((node, id) => {
          const dagrePos = g.node(id);
          if (dagrePos) {
            const existingNode = finalNodesMap.get(id)!;
            const updatedNode = {
              ...existingNode,
              x: dagrePos.x + offsetX,
              y: dagrePos.y + offsetY,
              // Gán "side" để đường kẻ vẽ đúng
              side: (islandLayoutDir === 'LR' ? (dagrePos.x < 0 ? 'left' : 'right') : 'right') as 'left' | 'right', 
            };
            finalNodesMap.set(id, updatedNode); // Cập nhật lại map
          }
        });
      } // Kết thúc vòng lặp for (duyệt các đảo)
      
      // 10. Chuyển map cuối cùng về mảng newNodes
      newNodes = Array.from(finalNodesMap.values());

      // Cập nhật state VÀ reset collapse root (UI mới)
      setGraph(newNodes, edges);
      setRootCollapse({ left: false, right: false });

      // Logic Căn giữa/Zoom (Không đổi)
      if (newNodes.length === 0) {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight - 48;
        setDimensions({ width: currentWidth, height: currentHeight });
        setScale(1);
        setPos({ x: currentWidth / 2, y: currentHeight / 2 });
        return;
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      newNodes.forEach((node) => {
        const visual = nodeVisuals.get(node.id);
        const w = visual?.box.w || 100;
        const h = visual?.box.h || 50;
        const x = node.x; const y = node.y;
        minX = Math.min(minX, x - w / 2);
        maxX = Math.max(maxX, x + w / 2);
        minY = Math.min(minY, y - h / 2);
        maxY = Math.max(maxY, y + h / 2);
      });
      const boundsWidth = maxX - minX + 80;
      const boundsHeight = maxY - minY + 80;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight - 48;
      setDimensions({ width: currentWidth, height: currentHeight });
      if (boundsWidth <= 0 || boundsHeight <= 0) {
        if (!keepCamera) {
          setScale(1);
          setPos({
            x: currentWidth / 2 - newNodes[0].x,
            y: currentHeight / 2 - newNodes[0].y,
          });
        }
        return;
      }
      const scaleX = currentWidth / boundsWidth;
      const scaleY = currentHeight / boundsHeight;
      const newScale = Math.min(1, scaleX, scaleY);
      const boundsCenterX = minX + (maxX - minX) / 2;
      const boundsCenterY = minY + (maxY - minY) / 2;
      const newX = currentWidth / 2 - boundsCenterX * newScale;
      const newY = currentHeight / 2 - boundsCenterY * newScale;
      if (!keepCamera) {
        setScale(newScale);
        setPos({ x: newX, y: newY });
      }
    },
    [nodeVisuals, setGraph, edges] // [GĐ 7] Bỏ 'nodes'
  );

  // [SỬA] THÊM CÁC HÀM XỬ LÝ ZOOM NÀY
const zoomStep = 1.2; // Tốc độ zoom

const handleZoomIn = useCallback(() => {
  // Zoom vào vị trí trung tâm màn hình
  handleSetZoom(scale * zoomStep);
}, [scale]); // [SỬA] Thêm scale vào dependency

const handleZoomOut = useCallback(() => {
  // Zoom ra từ vị trí trung tâm màn hình
  handleSetZoom(scale / zoomStep);
}, [scale]); // [SỬA] Thêm scale vào dependency

const handleSetZoom = useCallback((newScale: number) => {
  const stage = stageRef.current;
  if (!stage) {
    setScale(newScale);
    return;
  }

  const { width, height } = dimensions;
  const oldScale = scale;

  // Lấy vị trí trung tâm màn hình
  const center = { x: width / 2, y: height / 2 };

  // Tính toán điểm thế giới (world point) mà trung tâm màn hình đang trỏ tới
  const mousePointTo = {
    x: (center.x - pos.x) / oldScale,
    y: (center.y - pos.y) / oldScale,
  };

  // Đặt scale mới
  setScale(newScale);

  // Cập nhật vị trí (pos) để giữ nguyên điểm trung tâm
  setPos({
    x: center.x - mousePointTo.x * newScale,
    y: center.y - mousePointTo.y * newScale,
  });
}, [scale, pos.x, pos.y, dimensions.width, dimensions.height]);

const handleFitToScreen = useCallback(() => {
  // Gọi handleLayout(false) sẽ tự động căn giữa và zoom
  handleLayout(false); 
}, [handleLayout]); 

  // ================================================
  // Node Actions [CẬP NHẬT GĐ 7 + 9]
  // ================================================

  const startEditing = useCallback((nodeId: string) => {
    setSelectedNodeIds([nodeId]);
    setEditingNodeId(nodeId);
    setTimeout(() => {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }, 50);
  }, []);

  const justStoppedEditingRef = useRef(false);

  useEffect(() => {
    if (!isDataLoaded || !justStoppedEditingRef.current) return;
    justStoppedEditingRef.current = false;
    setTimeout(() => {
      handleLayout(true); // true = keepCamera
    }, 0);
  }, [nodes, isDataLoaded, handleLayout]);

  const stopEditing = useCallback(
    (save: boolean) => {
      lastEditStopTime.current = Date.now();
      if (!editingNodeId) return;
      const node = nodes.find((n) => n.id === editingNodeId);
      if (!node) return;
      const newText = editingInputRef.current?.value ?? node.nodeText;
      setEditingNodeId(null);

      if (save && newText !== node.nodeText) {
        const newNodes = nodes.map((n) =>
          n.id === editingNodeId ? { ...n, nodeText: newText } : n
        );
        setGraph(newNodes, edges);
        justStoppedEditingRef.current = true; 
        useEditorStore.setState({ isDirty: true });
        debouncedPushHistory();
        debouncedPersistData();
        sendPatch('NODE_TEXT_CHANGE', { id: editingNodeId, text: newText }); 
      }
    },
    [
      editingNodeId, nodes, edges, setGraph, 
      debouncedPushHistory, debouncedPersistData, sendPatch, // GĐ 7 & 9
    ]
  );

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodeMap.get(parentId); // Lấy dữ liệu THÔ của node cha
    const parentVisual = nodeVisuals.get(parentId); // Lấy dữ liệu HÌNH ẢNH của node cha
    
    if (!parentNode || !parentVisual) return;

    const parentComputedStyle = parentVisual.style; // Dùng để lấy vị trí, "bên" (side)

    const newId = "n" + Date.now();

    // 1. Bắt đầu với các thuộc tính cơ bản
    const newNodeData: NodeData = { 
      id: newId, 
      nodeText: "Nội dung",
      // Lấy vị trí và "bên" (side) từ style đã tính toán của cha
      x: parentComputedStyle.x + 40,
      y: parentComputedStyle.y + 20,
      parentId,
      side: parentComputedStyle.side, 
    };

    // 2. Lấy TẤT CẢ các key style từ DEFAULT_NODE_STYLE
    const styleKeys = Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>;

    // 3. Sao chép TẤT CẢ các giá trị style từ node cha (parentNode)
    styleKeys.forEach(key => {
      // Nếu node cha (dữ liệu thô) có định nghĩa một style cụ thể (không phải undefined),
      // thì node con sẽ kế thừa nó.
      if (parentNode[key] !== undefined) {
        (newNodeData as any)[key] = parentNode[key];
      }
    });

    // 4. Xử lý trường hợp đặc biệt: Kế thừa từ ROOT
    if (parentId === 'root') {
      // Không kế thừa style hình dạng của root (root to, màu khác)
      // Đặt lại chúng về 'undefined' để chúng lấy từ theme/quickstyle
      newNodeData.color = undefined;
      newNodeData.textColor = undefined;
      newNodeData.shape = undefined;
      newNodeData.borderColor = undefined;
      newNodeData.borderWidth = undefined;
      newNodeData.fontSize = undefined; 
      newNodeData.fontWeight = undefined;
      newNodeData.textCase = undefined;
      newNodeData.nodeLength = undefined; 
    }

    const newEdgeData: EdgeData = { id: `e-${newId}`, from: parentId, to: newId };
    
    const newNodes = [...nodes, newNodeData];
    const newEdges = [...edges, newEdgeData];

    pushHistory(nodes, edges);
    setGraph(newNodes, newEdges);
    startEditing(newId);
    setTimeout(() => handleLayout(true), 50); 
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout]); // CẬP NHẬT: Thêm nodeMap

  const handleAddSibling = useCallback((nodeId: string) => {
    if (nodeId === 'root') { 
      handleAddChild('root'); // Trường hợp đặc biệt: thêm "anh em" cho root -> thêm con
      return; 
    }

    const siblingNode = nodeMap.get(nodeId); 
    const parentId = siblingNode?.parentId;

    if (!parentId || !siblingNode) return; 

    const parentVisual = nodeVisuals.get(parentId);
    if (!parentVisual) return;

    const newId = "n" + Date.now();

    const newNodeData: NodeData = { 
      id: newId, 
      nodeText: "Nội dung",
      x: parentVisual.style.x + 40, 
      y: parentVisual.style.y + 40, 
      parentId: parentId, 
      side: siblingNode.side, 
    };

    const styleKeys = Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>;

    styleKeys.forEach(key => {
      if (siblingNode[key] !== undefined) {
        (newNodeData as any)[key] = siblingNode[key];
      }
    });

    const newEdgeData: EdgeData = { id: `e-${newId}`, from: parentId, to: newId };
    
    const newNodes = [...nodes, newNodeData];
    const newEdges = [...edges, newEdgeData];

    pushHistory(nodes, edges);
    setGraph(newNodes, newEdges);
    startEditing(newId);
    setTimeout(() => handleLayout(true), 50); 
    
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout, handleAddChild]);

  const handleDeleteNode = useCallback(
    () => { // Bỏ tham số nodeId
      if (selectedNodeIds.length === 0) return;

      const idsToDelete = selectedNodeIds.filter(id => id !== 'root');
      if (idsToDelete.length === 0) return;

      const nodesToDelete = new Set<string>();
      const findChildren = (id: string) => {
        edges.forEach((e) => {
          if (e.from === id) {
            nodesToDelete.add(e.to);
            findChildren(e.to);
          }
        });
      };
      
      idsToDelete.forEach(id => {
        nodesToDelete.add(id);
        findChildren(id);
      });

      // Chọn cha của node ĐẦU TIÊN bị xóa
      const parentId = nodes.find((n) => n.id === idsToDelete[0])?.parentId ?? 'root';
      const newNodes = nodes.filter((n) => !nodesToDelete.has(n.id));
      const newEdges = edges.filter(
        (e) => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to)
      );
      setGraph(newNodes, newEdges);
      setSelectedNodeIds([parentId]); // Chọn node cha
      setTimeout(() => handleLayout(true), 50);
      debouncedPushHistory();
      debouncedPersistData();
      sendPatch('NODE_DELETE', { nodeIds: Array.from(nodesToDelete) });
    },
    [
      nodes, edges, setGraph, selectedNodeIds, handleLayout, // Cập nhật dependency
      debouncedPushHistory, debouncedPersistData, sendPatch,
    ]
  );

  const handleUpdateNode = (updates: Partial<NodeData>) => {
    if (selectedNodeIds.length === 0) return;

    let newNodes = [...nodes];
    const idSet = selectedIdsSet;

    // [MERGE] Giữ lại logic `styleLocked` từ feature/tt
    const STYLE_KEYS: Array<keyof NodeData> = [
      'shape', 'color', 'borderColor', 'borderWidth', 'borderStyle',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'textColor', 'textCase', 'nodeLength',
      'branchColor', 'branchLineStyle', 'branchLineEnd', 'branchLineThickness'
    ];
    const isStyleUpdate = Object.keys(updates).some(k => STYLE_KEYS.includes(k as keyof NodeData));

    if (updates.branchColor !== undefined) {
      const updateBranchColorRecursive = (nodeId: string, color: string) => {
        // Chỉ áp dụng cho node đang được chọn
        if (idSet.has(nodeId)) {
          newNodes = newNodes.map(n => n.id === nodeId ? { ...n, branchColor: color } : n);
        }
        edges.forEach(e => { if (e.from === nodeId) updateBranchColorRecursive(e.to, color); });
      };
      // Lặp qua tất cả node được chọn
      selectedNodeIds.forEach(id => updateBranchColorRecursive(id, updates.branchColor as string));
    }
    
    // Áp dụng update cho tất cả node được chọn
    newNodes = newNodes.map(n => idSet.has(n.id) ? { ...n, ...updates } : n);
    
    if (isStyleUpdate) {
      const lockRec = (nodeId: string) => {
        newNodes = newNodes.map(n => n.id === nodeId ? { ...n, styleLocked: true } : n);
        edges.forEach(e => { if (e.from === nodeId) lockRec(e.to); });
      };
      // Lặp qua tất cả node được chọn
      selectedNodeIds.forEach(id => lockRec(id));
    }

    setGraph(newNodes, edges);
    if (updates.nodeLength) {
      setTimeout(() => handleLayout(true), 50);
    }
    debouncedPushHistory();
    debouncedPersistData();
    // Gửi patch cho TỪNG node
    selectedNodeIds.forEach(id => {
      sendPatch('NODE_STYLE_UPDATE', { id, updates });
    });
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (Date.now() - lastEditStopTime.current < 100) {
          e.preventDefault();
          return;
        }
      }
      if (e.key === 'Tab') {
        e.preventDefault(); // LUÔN LUÔN chặn trình duyệt "nhảy"

        // Chỉ thêm node con nếu:
        // 1. Không đang edit (editingNodeId là null)
        // 2. Chỉ có 1 node được chọn
        if (!editingNodeId && selectedNodeIds.length === 1) {
          handleAddChild(selectedNodeIds[0]);
        }
        // Nếu đang edit, hoặc chọn nhiều node, hoặc không chọn node nào,
        // phím Tab sẽ không làm gì cả (vì đã preventDefault).
        return; // Kết thúc xử lý cho phím Tab
      }
      if (editingNodeId) return;
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      )
        return;

      // [SỬA 1] Di chuyển Undo/Redo lên TRƯỚC khi kiểm tra selectedNodeId
      // để đảm bảo chúng hoạt động toàn cục.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return; // Thoát sớm
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return; // Thoát sớm
      }

      if (selectedNodeIds.length !== 1) {
        // Ngoại trừ phím Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteNode(); // Gọi hàm không tham số
        }
        return;
      }
      
      const singleSelectedId = selectedNodeIds[0]; // Đây là node duy nhất đang được chọn

      if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild(singleSelectedId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSibling(singleSelectedId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteNode(); // Gọi hàm không tham số
      } else if (e.key === 'F2') {
        e.preventDefault();
        startEditing(singleSelectedId);
      } else if (
        e.key.length === 1 &&
        /^[a-zA-Z0-9\S]$/.test(e.key) &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        startEditing(singleSelectedId);
        setTimeout(() => {
          if (editingInputRef.current) editingInputRef.current.value = e.key;
        }, 50);
      }
    },
    [
      editingNodeId, selectedNodeIds, handleAddChild, // Cập nhật dependency
      handleAddSibling, handleDeleteNode, undo, redo, startEditing,
    ]
  );

  const handleToolbarAddChild = useCallback(() => {
    // Chỉ hoạt động nếu 1 node (và chỉ 1) đang được chọn
    if (selectedNodeIds.length === 1) { 
      handleAddChild(selectedNodeIds[0]);
    }
  }, [selectedNodeIds, handleAddChild]); // handleAddChild đã được bọc trong useCallback

  const handleToolbarAddSibling = useCallback(() => {
    // Chỉ hoạt động nếu 1 node (và chỉ 1) đang được chọn
    if (selectedNodeIds.length === 1) { 
      handleAddSibling(selectedNodeIds[0]);
    }
  }, [selectedNodeIds, handleAddSibling]);

  const handleSetHyperlink = useCallback(() => {
  if (selectedNodeIds.length !== 1) return;
  const nodeId = selectedNodeIds[0];
  const node = nodeMap.get(nodeId);
  if (!node) return;

  

  // Lấy hyperlink hiện tại (nếu có) từ node.
  // Cần đảm bảo `node.hyperlink` tồn tại trong kiểu NodeData của bạn.
  const currentUrl = (node as any).hyperlink || "";
  const url = window.prompt("Nhập URL cho liên kết (để trống để xóa):", currentUrl);
  
  if (url !== null) { // User clicked OK (null nghĩa là Cancel)
    // Chúng ta gọi handleUpdateNode, nó đã được refactor để xử lý nhiều node
    // nhưng ở đây nó sẽ chỉ áp dụng cho 1 node đang được chọn
    handleUpdateNode({ hyperlink: url || undefined });
  }
  }, [selectedNodeIds, nodeMap, handleUpdateNode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ================================================
  // Drag & Drop [CẬP NHẬT GĐ 7 + 9]
  // ================================================

  const handleDragStart = (nodeId: string) => {
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges); // GĐ 7
    setDragStartState({ nodes, edges });
    const node = stageRef.current?.findOne(`#${nodeId}`);
    if (node && editingNodeId === nodeId) {
      node.stopDrag();
    }
  };

  const handleDragMove = (e: any, draggedNodeId: string) => {
    const pos = e.target.position();
    let targetFound: string | null = null;
    for (const node of nodes) {
      if (node.id === draggedNodeId) continue;
      const visual = nodeVisuals.get(node.id);
      if (!visual) continue;
      const { w, h } = visual.box;
      const { x, y } = visual.style;
      const isOver =
        pos.x > x - w / 2 &&
        pos.x < x + w / 2 &&
        pos.y > y - h / 2 &&
        pos.y < y + h / 2;
      if (isOver) {
        targetFound = node.id;
        break;
      }
    }
    setDropTargetId(targetFound);
  };

  const handleDragEnd = (e: any, draggedNodeId: string) => {
    setDragStartState(null);
    const finalX = e.target.x();
    const finalY = e.target.y();

    if (dropTargetId && dropTargetId !== draggedNodeId) {
      // Reparent
      const draggedNode = nodes.find((n) => n.id === draggedNodeId);
      if (!draggedNode) return;
      let isDroppingOnChild = false;
      const checkChildren = (id: string) => {
        if (id === dropTargetId) {
          isDroppingOnChild = true;
          return;
        }
        edges.filter((e) => e.from === id).forEach((e) => checkChildren(e.to));
      };
      checkChildren(draggedNodeId);
      if (isDroppingOnChild) {
        addToast('Không thể di chuyển node cha vào node con!', 'error');
        setGraph(dragStartState?.nodes || nodes, dragStartState?.edges || edges);
        setDropTargetId(null);
        return;
      }
      const newParentId = dropTargetId;
      const oldEdge = edges.find((e) => e.to === draggedNodeId);
      let newEdges: EdgeData[];
      if (oldEdge) {
        newEdges = edges.map((e) =>
          e.id === oldEdge.id ? { ...e, from: newParentId } : e
        );
      } else {
        newEdges = [
          ...edges,
          { id: `e-${draggedNodeId}`, from: newParentId, to: draggedNodeId },
        ];
      }
      const parentSide = nodeMap.get(newParentId)?.side || 'right';
      const newNodes = nodes.map((n) =>
        n.id === draggedNodeId
          ? {
              ...n,
              parentId: newParentId,
              x: finalX,
              y: finalY,
              side: parentSide,
            }
          : n
      );
      setGraph(newNodes, newEdges);
      // [GĐ 9] Gửi patch
      sendPatch('NODE_REPARENT', {
        nodeId: draggedNodeId, newParentId, x: finalX, y: finalY, side: parentSide,
      });
    } else {
      // Kéo
      const newNodes = nodes.map((n) => {
        if (n.id === draggedNodeId) {
          if (n.parentId) {
            return { ...n, x: finalX, y: finalY };
          }
          return {
            ...n, x: finalX, y: finalY, parentId: undefined, side: undefined,
          };
        }
        return n;
      });
      setGraph(newNodes, edges);
      // [GĐ 9] Gửi patch
      sendPatch('NODE_MOVE', { id: draggedNodeId, x: finalX, y: finalY });
    }
    setDropTargetId(null);
    setTimeout(() => handleLayout(true), 50); // Giữ camera
    // [GĐ 7] Gọi debouncer
    // [SỬA 2] Xóa debouncedPushHistory. Đã push ở handleDragStart.
    // debouncedPushHistory();
    debouncedPersistData();
  };

  // ================================================
  // Handlers cho Toolbar [CẬP NHẬT GĐ 7 + 9]
  // ================================================

  // [MERGE] Giữ lại logic UI mới từ feature/tt
  const handleToggleColoredBranch = (state: boolean) => {
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges); // Logic này ảnh hưởng toàn bộ, push ngay
    if (state) {
      const rootChildren = edges.filter(e => e.from === 'root').map(e => e.to);
      let newNodes = [...nodes];
      rootChildren.forEach((childId, idx) => {
        const color = BRANCH_COLORS_PALETTE[idx % BRANCH_COLORS_PALETTE.length];
        const assignRec = (nodeId: string) => {
          newNodes = newNodes.map(n => n.id === nodeId ? (n.styleLocked ? n : { ...n, branchColor: color, color: mixWithWhite(color, 0.8), textColor: getContrastColor(mixWithWhite(color, 0.8)) }) : n);
          edges.forEach(e => { if (e.from === nodeId) assignRec(e.to); });
        };
        assignRec(childId);
      });
      setGlobalStore({ isColoredBranch: true });
      setGraph(newNodes, edges);
    } else {
      const globalColor = useEditorStore.getState().globalBranchColor;
      let newNodes = nodes.map(n => (n.styleLocked ? n : { ...n, branchColor: undefined, color: mixWithWhite(globalColor, 0.85), textColor: getContrastColor(mixWithWhite(globalColor, 0.85)) }));
      setGlobalStore({ isColoredBranch: false });
      setGraph(newNodes, edges);
    }
    // [GĐ 7 & 9] Kích hoạt lưu và gửi patch
    debouncedPersistData();
    sendPatch('LINE_COLOR_TOGGLE', { state });
  };

  // [MERGE] Giữ lại logic UI mới từ feature/tt
  const handleSetBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    const newNodes = nodes.map(n => {
      if (n.styleLocked) return n;
      const fill = mixWithWhite(color, 0.85);
      const branchFill = color;
      return { 
        ...n, 
        color: n.color || fill, 
        branchColor: n.branchColor || branchFill,
        textColor: getContrastColor(fill) 
      };
    });
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges); // Logic này ảnh hưởng toàn bộ, push ngay
    setGraph(newNodes, edges);
    // [GĐ 7 & 9] Kích hoạt lưu và gửi patch
    debouncedPersistData();
    sendPatch('BACKGROUND_CHANGE', { color });
  };
  
const handleSetGlobalBranchColor = (color: string) => {
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
    // 1. Cập nhật màu toàn cục trong store
    setGlobalStore({ globalBranchColor: color });

    const { isColoredBranch } = useEditorStore.getState();

    // 2. Nếu KHÔNG ở chế độ nhiều màu, cập nhật lại màu cho các node
    if (!isColoredBranch) {
      const newNodes = nodes.map(n => {
        if (n.styleLocked) return n; // Bỏ qua node đã khóa style

        const fill = mixWithWhite(color, 0.85); // Dùng màu toàn cục mới
        return {
          ...n,
          branchColor: undefined, // Đảm bảo nó kế thừa màu toàn cục
          color: fill,
          textColor: getContrastColor(fill)
        };
      });
      setGraph(newNodes, edges);
    }
    // (Nếu isColoredBranch = true, không cần làm gì,
    // vì logic render đã tự đọc globalBranchColor khi cần)

    debouncedPersistData();
    // Gửi patch cho các user khác
    sendPatch('GLOBAL_BRANCH_COLOR_CHANGE', { color });
  };

  const handleApplyQuickStyle = (styleId: QuickStyleId) => {
    if (selectedNodeIds.length === 0) return;
    const idSet = selectedIdsSet;

    const newNodes = nodes.map((n) => {
      if (idSet.has(n.id)) {
        const resetStyle = applyNodeDefaults(n, activeTheme);
        return { ...n, ...resetStyle, quickStyleId: styleId };
      }
      return n;
    });
    
    setGraph(newNodes, edges);
    setTimeout(() => handleLayout(true), 50);
    debouncedPushHistory();
    debouncedPersistData();
    
    // Gửi patch cho TỪNG node
    const tempResetStyle = applyNodeDefaults(nodes[0], activeTheme); // Tạm
    selectedNodeIds.forEach(id => {
      // TODO: Cần lấy resetStyle chính xác cho từng node
      sendPatch('NODE_QUICK_STYLE_APPLY', { id: id, styleId, resetStyle: tempResetStyle });
    });
  };

  const handleCopyStyle = () => {
    if (!currentNode) return;
    const styleToCopy: Partial<NodeData> = {};
    (Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>).forEach(key => {
      if (currentNode[key] !== undefined) {
        (styleToCopy as any)[key] = currentNode[key];
      }
    });
    setStyleClipboard(styleToCopy);
    addToast('Đã sao chép kiểu!', 'success');
  };

  const handlePasteStyle = () => {
    if (!selectedNodeIds || !styleClipboard) return;
    const idSet = selectedIdsSet;
    const newNodes = nodes.map((n) =>
      idSet.has(n.id) ? { ...n, ...styleClipboard } : n
    );
    setGraph(newNodes, edges);
    setTimeout(() => handleLayout(true), 50);
    debouncedPushHistory();
    debouncedPersistData();
    sendPatch('NODE_STYLE_PASTE', { id: selectedNodeIds, style: styleClipboard }); // GĐ 9
  };

  const handleResetStyle = () => {
    if (!selectedNodeIds || !currentNode) return;
    const idSet = selectedIdsSet;
    const resetStyle = applyNodeDefaults(currentNode, activeTheme);
    const newNodes = nodes.map((n) =>
      idSet.has(n.id) ? { ...n, ...resetStyle } : n
    );
    setGraph(newNodes, edges);
    setTimeout(() => handleLayout(true), 50);
    debouncedPushHistory();
    debouncedPersistData();
    sendPatch('NODE_STYLE_RESET', { id: selectedNodeIds, resetStyle }); // GĐ 9
  };

  // ================================================
  // Logic Collapse [MERGE GĐ 7 + 9]
  // ================================================

  const handleToggleCollapse = useCallback(
    (e: any, nodeId: string, side?: 'left' | 'right') => {
      e.cancelBubble = true;
      
      // [MERGE] Giữ lại logic UI mới (root collapse) từ feature/tt
      if (nodeId === 'root' && side) {
        setRootCollapse(prev => ({ ...prev, [side]: !prev[side] }));
        // [GĐ 9] Gửi patch cho Root collapse
        sendPatch('ROOT_TOGGLE_COLLAPSE', { side });
        // Không push history, không persist (đây là UI state)
      } else if (nodeId !== 'root') {
        // [MERGE] Giữ lại logic GĐ 7/9 (node con collapse)
        const newNodes = nodes.map(n => 
          n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
        );
        setGraph(newNodes, edges);
        debouncedPushHistory();
        debouncedPersistData();
        sendPatch('NODE_TOGGLE_COLLAPSE', { id: nodeId }); // GĐ 9
      }
    },
    [
      nodes, edges, setGraph, debouncedPushHistory, 
      debouncedPersistData, sendPatch, // GĐ 7 & 9
    ]
  );

  // [MERGE] Giữ lại logic UI mới (isNodeVisible) từ feature/tt
  const isNodeVisible = useCallback((nodeId: string): boolean => {
    const node = nodeMap.get(nodeId);
    if (!node) return false;
    if (nodeId === 'root' || !node.parentId) return true;
    if (node.parentId === 'root') {
      if (node.side === 'left' && rootCollapse.left) return false;
      if ((node.side === 'right' || !node.side) && rootCollapse.right) return false;
    }
    const parent = nodeMap.get(node.parentId);
    if (!parent) return true;
    if (parent.collapsed) return false;
    if (parent.id === 'root') return true;
    return isNodeVisible(node.parentId);
  }, [nodeMap, rootCollapse]);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => isNodeVisible(n.id)),
    [nodes, isNodeVisible]
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );
  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
      ),
    [edges, visibleNodeIds]
  );

  // [MERGE] Giữ lại logic UI mới (descendantCounts) từ feature/tt
  const descendantCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const rootCounts = { left: 0, right: 0 };
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adj.has(edge.from)) adj.set(edge.from, []);
      adj.get(edge.from)!.push(edge.to);
    }
    const dfs = (nodeId: string): number => {
      const children = adj.get(nodeId) || [];
      let total = children.length;
      for (const childId of children) {
        total += dfs(childId);
      }
      counts.set(nodeId, total);
      return total;
    };
    for (const nodeId of nodeMap.keys()) {
      if (!counts.has(nodeId)) {
        dfs(nodeId);
      }
    }
    const rootChildren = adj.get('root') || [];
    for (const childId of rootChildren) {
      const childNode = nodeMap.get(childId);
      const childTotalCount = (counts.get(childId) || 0) + 1;
      if (childNode?.side === 'left') {
        rootCounts.left += childTotalCount;
      } else {
        rootCounts.right += childTotalCount;
      }
    }
    return { counts, rootCounts };
  }, [edges, nodeMap]);

  useEffect(() => {
    if (!editingNodeId || !editingInputRef.current) return;
    const el = editingInputRef.current;
    const resize = () => {
      const visual = nodeVisuals.get(editingNodeId!);
      if (!visual || !el) return;
      el.style.height = 'auto';
      const unscaledScroll = el.scrollHeight / Math.max(scale, 0.0001);
      const target = Math.max(visual.box.h, unscaledScroll);
      el.style.height = `${target}px`;
    };
    resize();
    const t = setTimeout(resize, 50);
    return () => clearTimeout(t);
  }, [editingNodeId, scale, pos, nodeVisuals]); 

  const computeEditingNodePosition = useCallback(() => {
    if (!editingNodeId) return null;
    const visual = nodeVisuals.get(editingNodeId);
    if (!visual || !stageRef.current) return null;
    const node = nodeMap.get(editingNodeId);
    if (!node) return null;
    const { style, box } = visual;
    const { w, h, finalFontSize } = box;
    const stageRect = stageRef.current.container().getBoundingClientRect();
    const transform = stageRef.current.getAbsoluteTransform();
    const screenPos = transform.point({ x: style.x, y: style.y });
    return {
      left: stageRect.left + screenPos.x - w / 2,
      top: stageRect.top + screenPos.y - h / 2,
      width: w,
      height: h,
      fontSize: finalFontSize,
      fontFamily: style.fontFamily || 'Inter',
      fontWeight: style.fontWeight || 'normal',
      fontStyle: style.fontStyle === 'italic' ? 'italic' : 'normal',
      textAlign: style.textAlign || 'center',
      textColor: style.textColor || '#333333',
      textDecoration: style.textDecoration || 'none',
    };
  }, [editingNodeId, nodeVisuals, nodeMap, scale, pos]);

  // ================================================
  // Render (Hợp nhất JSX của feature/tt với Logic của chúng ta)
  // ================================================

  if (!isDataLoaded) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center text-gray-800 gap-2">
        <Spinner className="w-8 h-8 border-gray-400 border-t-gray-800" />
        Đang tải...
      </div>
    );
  }

  return (
    <>
      <style>
        {fonts
          .map(
            (font) =>
              `@import url('https://fonts.googleapis.com/css2?family=${
                font.value.split(',')[0].replace(/ /g, '+')
              }:wght@400;700&display=swap');`
          )
          .join('\n')}
      </style>
      <div className="w-screen h-screen bg-white overflow-hidden flex flex-col">
        <EditorToolbar
          onCommitName={() => {
            debouncedPersistData();
            sendPatch('MAP_NAME_CHANGE', { name });
          }}
          onDashboard={() => navigate('/dashboard')}
          onUndo={undo}
          onRedo={redo}
          onShare={() => {
            navigator.clipboard.writeText(window.location.href);
            addToast('Đã sao chép link chia sẻ!', 'success');
          }}
          onTheme={toggleTheme} 
          onSave={handleSave}
          isDirty={isDirty}
          onToggleFormattingToolbar={() =>
            setFormattingToolbarOpen(!isFormattingToolbarOpen)
          }
          currentScale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSetZoom={handleSetZoom}
          onFitToScreen={handleFitToScreen}
          selectedNodeIds={selectedNodeIds}
          onAddChild={handleToolbarAddChild}
          onAddSibling={handleToolbarAddSibling}
          onSetHyperlink={handleSetHyperlink}
        />
        <Sidebar />

        {editingNodeId &&
          (() => {
            // [MERGE] Giữ lại logic textarea wrapper mới của feature/tt
            const visual = nodeVisuals.get(editingNodeId!);
            const node = nodeMap.get(editingNodeId!);
            if (!visual || !node || !stageRef.current) return null;
            const stageRect = stageRef.current.container().getBoundingClientRect();
            const wrapperStyle: React.CSSProperties = {
              position: 'absolute',
              left: stageRect.left,
              top: stageRect.top,
              width: stageRect.width,
              height: stageRect.height,
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              zIndex: 50,
              pointerEvents: 'none',
            };
            const localLeft = visual.style.x - visual.box.w / 2;
            const localTop = visual.style.y - visual.box.h / 2;
            return (
              <div style={wrapperStyle}>
                <textarea
                  ref={editingInputRef}
                  defaultValue={node.nodeText}
                  onInput={(e) => {
                    const el = e.currentTarget as HTMLTextAreaElement;
                    const visualNow = visual;
                    if (!visualNow) return;
                    el.style.height = 'auto';
                    const unscaledScroll = el.scrollHeight / Math.max(scale, 0.0001);
                    const targetH = Math.max(visualNow.box.h, unscaledScroll);
                    el.style.height = `${targetH}px`;
                  }}
                  onBlur={() => stopEditing(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      stopEditing(true);
                    } else if (e.key === 'Escape') {
                      stopEditing(false);
                    } else if (e.key === 'Tab') {
                      e.preventDefault(); // Ngăn Tab nhảy focus
                      stopEditing(true); // Lưu và kết thúc
                  }
                  }}
                  style={{
                    position: 'absolute',
                    left: localLeft,
                    top: localTop,
                    width: visual.box.w,
                    height: visual.box.h,
                    fontSize: `${visual.box.finalFontSize}px`,
                    fontWeight: visual.style.fontWeight || 'normal',
                    fontStyle: visual.style.fontStyle === 'italic' ? 'italic' : 'normal',
                    fontFamily: visual.style.fontFamily || 'Inter',
                    lineHeight: LINE_HEIGHT_MULTIPLIER,
                    padding: `${PADDING_Y}px ${PADDING_X}px`,
                    textAlign: visual.style.textAlign || 'center',
                    textDecoration: visual.style.textDecoration || 'none',
                    color: visual.style.textColor || '#333333',
                    backgroundColor: visual.style.color,
                    border: `${visual.style.borderWidth || 0}px ${
                      visual.style.borderStyle === 'dashed' ? 'dashed'
                      : visual.style.borderStyle === 'dotted' ? 'dotted'
                      : 'solid'
                    } ${visual.style.borderColor || 'transparent'}`,
                    borderRadius: visual.style.shape === 'roundedRect' ? '8px' : '0px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    boxShadow: 'none',
                    transition: 'none',
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                  }}
                  className="z-50 rounded-md outline-none resize-none"
                />
              </div>
            );
          })()}

        <div
          className="w-full h-full pt-12 relative" // UI Mới (pt-12)
          style={{ backgroundColor }}
        >
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            scaleX={scale}
            scaleY={scale}
            x={pos.x}
            y={pos.y}
            onWheel={(e) => {
              e.evt.preventDefault(); // Ngăn trang web cuộn
              const stage = e.target.getStage();
              if (!stage) return;

              if (e.evt.ctrlKey) {
                // === LOGIC ZOOM (Giữ nguyên) ===
                const scaleBy = 1.05;
                const oldScale = stage.scaleX();
                const pointerPos = stage.getPointerPosition();
                if (!pointerPos) return;

                const mousePointTo = {
                  x: (pointerPos.x - stage.x()) / oldScale,
                  y: (pointerPos.y - stage.y()) / oldScale,
                };
                const newScale =
                  e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                setScale(newScale);
                setPos({
                  x: pointerPos.x - mousePointTo.x * newScale,
                  y: pointerPos.y - mousePointTo.y * newScale,
                });
              } else {
                // === LOGIC PAN (Thêm mới) ===
                // Dùng cho cuộn chuột 2 ngón tay trên touchpad
                setPos({
                  x: pos.x - e.evt.deltaX, // Dùng dấu trừ để di chuyển đúng hướng
                  y: pos.y - e.evt.deltaY,
                });
              }
            }}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              if (!stage) return;

              const isPanIntent = (e.evt.ctrlKey && e.evt.button === 0) || e.evt.button === 1;

              // Chỉ xử lý khi click vào nền (Stage)
              if (e.target === stage) {
                if (isPanIntent) {
                  setIsPanning(true);
                  isSelecting.current = false;
                } else if (e.evt.button === 0) {
                  // Click trái bình thường -> Bắt đầu chọn vùng
                  setIsPanning(false);
                  isSelecting.current = true;
                  
                  const pos = stage.getPointerPosition();
                  if (!pos) return;
                  
                  // Lấy vị trí tương đối (un-scaled)
                  const unscaledPos = {
                    x: (pos.x - stage.x()) / stage.scaleX(),
                    y: (pos.y - stage.y()) / stage.scaleY(),
                  };
                  
                  selectionStartPos.current = unscaledPos;
                  setSelectionRect({
                    x: unscaledPos.x,
                    y: unscaledPos.y,
                    width: 0,
                    height: 0,
                    visible: true,
                  });
                  
                  // Nếu không giữ Shift, bỏ chọn tất cả
                  if (!e.evt.shiftKey) {
                    setSelectedNodeIds([]);
                  }
                  if (editingNodeId) stopEditing(true);
                }
              }
            }}
            onMouseUp={(e) => {
              setIsPanning(false);

              if (isSelecting.current && selectionRect.visible) {
                // Đã kéo xong, ẩn hình chữ nhật
                isSelecting.current = false;
                setSelectionRect({ ...selectionRect, visible: false });

                // Xác định các node nằm trong vùng chọn
                const { x, y, width, height } = selectionRect;
                const rect = {
                  x1: x,
                  y1: y,
                  x2: x + width,
                  y2: y + height,
                };

                const newlySelectedIds = visibleNodes
                  .filter((node) => {
                    // Chọn nếu tâm node nằm trong hình chữ nhật
                    return (
                      node.x > rect.x1 &&
                      node.x < rect.x2 &&
                      node.y > rect.y1 &&
                      node.y < rect.y2
                    );
                  })
                  .map((node) => node.id);

                if (e.evt.shiftKey) {
                  // Thêm vào danh sách cũ
                  setSelectedNodeIds(prevIds => [...new Set([...prevIds, ...newlySelectedIds])]);
                } else {
                  // Thay thế danh sách cũ
                  setSelectedNodeIds(newlySelectedIds);
                }
              }
            }}
            onMouseMove={(e) => {
              if (isPanning) {
                setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY });
              } else if (isSelecting.current) {
                // Cập nhật kích thước hình chữ nhật chọn
                const stage = e.target.getStage();
                if (!stage) return;
                const pos = stage.getPointerPosition();
                if (!pos) return;
                
                const currentUnscaledPos = {
                  x: (pos.x - stage.x()) / stage.scaleX(),
                  y: (pos.y - stage.y()) / stage.scaleY(),
                };
                
                const start = selectionStartPos.current;
                setSelectionRect({
                  visible: true,
                  x: Math.min(start.x, currentUnscaledPos.x),
                  y: Math.min(start.y, currentUnscaledPos.y),
                  width: Math.abs(start.x - currentUnscaledPos.x),
                  height: Math.abs(start.y - currentUnscaledPos.y),
               });
              }
            }}
            onDblClick={(e) => {
              const stage = e.target.getStage();
              if (e.target !== stage || !stage) return;
              const pointerPos = stage.getPointerPosition();
              if (!pointerPos) return;
              const worldX = (pointerPos.x - pos.x) / scale;
              const worldY = (pointerPos.y - pos.y) / scale;

              const newId = 'n' + Date.now();
              const newNodeData: NodeData = {
                id: newId,
                nodeText: 'Chủ đề nổi',
                x: worldX,
                y: worldY,
                parentId: undefined,
              };

              const newNodes = [...nodes, newNodeData];
              setGraph(newNodes, edges);
              startEditing(newId);
              // [MERGE GĐ 7+9]
              debouncedPushHistory();
              debouncedPersistData();
              sendPatch('NODE_CREATE', { node: newNodeData, edge: null });
            }}
            style={{
              cursor: isPanning ? 'grabbing' : 'default',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <Layer>
              {/* [MERGE] Giữ lại logic render Edge của feature/tt */}
              {visibleEdges.map((edge) => {
                const fromVisual = nodeVisuals.get(edge.from);
                const toVisual = nodeVisuals.get(edge.to);
                if (!fromVisual || !toVisual) return null;
                const { style: fromStyle, box: fromBox } = fromVisual;
                const { style: toStyle, box: toBox } = toVisual;
                let p1 = { x: fromStyle.x, y: fromStyle.y };
                let p4 = { x: toStyle.x, y: toStyle.y };
                const fromSide = fromStyle.side || 'right';
                const toSide = toStyle.side || 'right';
                let points: number[];
                if (globalStructure === 'org') {
                  p1 = { x: fromStyle.x, y: fromStyle.y + fromBox.h / 2 };
                  p4 = { x: toStyle.x, y: toStyle.y - toBox.h / 2 };
                  const midY = (p1.y + p4.y) / 2;
                  points = [p1.x, p1.y, p1.x, midY, p4.x, midY, p4.x, p4.y];
                } else if (globalStructure === 'mindmap') {
                  if (edge.from === 'root') {
                    p1 = { x: fromStyle.x + (toSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  } else {
                    p1 = { x: fromStyle.x + (fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  }
                  p4 = { x: toStyle.x + (toSide === 'left' ? toBox.w / 2 : -toBox.w / 2), y: toStyle.y };
                  points = [ p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y ];
                } else {
                  p1 = { x: fromStyle.x + (fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  p4 = { x: toStyle.x + (toSide === 'left' ? toBox.w / 2 : -toBox.w / 2), y: toStyle.y };
                  points = [ p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y ];
                }
                let strokeColor = globalBranchColor;
                if (isColoredBranch) {
                  if (fromStyle.id === 'root') {
                    const rootChildren = edges.filter(e => e.from === 'root').map(e => e.to);
                    const childIndex = rootChildren.indexOf(toStyle.id);
                    strokeColor = BRANCH_COLORS_PALETTE[childIndex % BRANCH_COLORS_PALETTE.length];
                  } else {
                    strokeColor = toStyle.branchColor || globalBranchColor;
                }
                } else {
                  strokeColor = globalBranchColor;
                }
                const strokeWidth = branchLineWidth || 2;
                const isBezier = toStyle.branchLineStyle === 'bezier' && globalStructure !== 'org';
                const lineProps = {
                  points: points,
                  stroke: strokeColor,
                  strokeWidth: strokeWidth,
                  bezier: isBezier,
                  lineCap: 'round' as const,
                  lineJoin: 'round' as const,
                };
                if (toStyle.branchLineEnd === 'arrow') {
                  return <Arrow {...lineProps} key={edge.id} pointerLength={8} pointerWidth={6} fill={strokeColor} />;
                }
                return <Line {...lineProps} key={edge.id} />;
              })}

              {/* [MERGE] Giữ lại logic render Node của feature/tt */}
              {visibleNodes.map((node) => {
                const visual = nodeVisuals.get(node.id);
                if (!visual) return null;
                const { style, box } = visual;
                const { w, h, textToRender, finalFontSize } = box;
                const isSelected = selectedIdsSet.has(node.id);
                const isDropTarget = node.id === dropTargetId;
                const hasChildren = nodesWithChildren.has(node.id);
                const shapeProps = {
                  width: w, height: h, offsetX: w / 2, offsetY: h / 2,
                  fill: style.color,
                  stroke: isDropTarget ? "#34d399" : (isSelected ? "#3b82f6" : style.borderColor),
                  strokeWidth: isDropTarget ? 4 : (isSelected ? 3 : (style.borderWidth || 0)),
                  dash: style.borderStyle === 'dashed' ? [8, 4] : (style.borderStyle === 'dotted' ? [2, 3] : undefined),
                };
                return (
                  <Group
                    key={node.id} id={node.id} x={style.x} y={style.y} draggable
                    onDragStart={() => handleDragStart(node.id)}
                    onDragMove={(e) => handleDragMove(e, node.id)}
                    onDragEnd={(e) => handleDragEnd(e, node.id)}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (e.evt.shiftKey) {
                        // Giữ Shift: Thêm/bớt
                        setSelectedNodeIds(prevIds => {
                          const newSet = new Set(prevIds);
                          if (newSet.has(node.id)) {
                            newSet.delete(node.id);
                          } else {
                            newSet.add(node.id);
                          }
                          return Array.from(newSet);
                        });
                      } else {
                        // Click thường: Chỉ chọn node này
                        setSelectedNodeIds([node.id]);
                      }
                    }}
                    onDblClick={(e) => { e.cancelBubble = true; startEditing(node.id); }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
               >
                    {(style.shape === 'rectangle' || style.shape === 'roundedRect') && (
                      <Rect {...shapeProps} cornerRadius={style.shape === 'roundedRect' ? 8 : 0} />
                    )}
                    
                    <Text
                      visible={editingNodeId !== node.id}
                      text={textToRender || '(...)'}
                      width={w} height={h} offsetX={w / 2} offsetY={h / 2}
                      align={style.textAlign}
                      verticalAlign="middle"
                      fill={style.textColor}
                      padding={PADDING_Y} listening={false}
                      fontSize={finalFontSize}
                      fontStyle={style.fontStyle === 'italic' ? 'italic' : style.fontWeight}
                      fontFamily={style.fontFamily}
                      textDecoration={style.textDecoration === 'none' ? undefined : style.textDecoration}
                      lineHeight={LINE_HEIGHT_MULTIPLIER}
                    />
                    
                    {/* [MERGE] Giữ lại logic UI mới (root collapse) từ feature/tt */}
                    {node.id === 'root' ? (
                      <>
                        {rootChildSides.left && (
                          <Group
                            x={-w / 2} y={0}
                            onClick={(e) => handleToggleCollapse(e, 'root', 'left')}
                            onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }}
                            onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}
                          >
                            <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                          {rootCollapse.left ? (
                              <Text
                                text={`${descendantCounts.rootCounts.left || 0}`}
                                fontSize={9} fill="#FFFFFF"
                                align="center" verticalAlign="middle"
                                width={16} height={16} offsetX={8} offsetY={8}
                                fontStyle="bold" listening={false}
                              />
                            ) : (
                              <Path data="M-4 0 H4" stroke="#FFFFFF" strokeWidth={2} lineCap="round" />
                            )}
                          </Group>
                        )}
                        {rootChildSides.right && (
                          <Group
                            x={w / 2} y={0}
                            onClick={(e) => handleToggleCollapse(e, 'root', 'right')}
                            onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }}
                            onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}
                          >
                            <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                          {rootCollapse.right ? (
                              <Text
                                text={`${descendantCounts.rootCounts.right || 0}`}
                                fontSize={9} fill="#FFFFFF"
                                align="center" verticalAlign="middle"
                                width={16} height={16} offsetX={8} offsetY={8}
                                fontStyle="bold" listening={false}
                              />
                            ) : (
                              <Path data="M-4 0 H4" stroke="#FFFFFF" strokeWidth={2} lineCap="round" />
                            )}
                          </Group>
                        )}
                      </>
                    ) : (
                      /* [MERGE] Giữ lại logic UI mới (node con collapse) từ feature/tt */
                      hasChildren && (
                        <Group
                          x={(style.side === 'left' ? -w / 2 : w / 2)}
                          y={0}
                          onClick={(e) => handleToggleCollapse(e, node.id)}
                          onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }}
                         onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}
                        >
                          <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                          {node.collapsed ? (
                            <Text
                              text={`${descendantCounts.counts.get(node.id) || 0}`}
                              fontSize={9} fill="#FFFFFF"
                              align="center" verticalAlign="middle"
                              width={16} height={16} offsetX={8} offsetY={8}
                              fontStyle="bold" listening={false}
                            />
                          ) : (
                            <Path data="M-4 0 H4" stroke="#FFFFFF" strokeWidth={2} lineCap="round" />
                          )}
                        </Group>
                       )
                    )}
                    {(style as any).hyperlink && (
                    <Group
                      // Đặt icon ở góc trên bên phải, bên ngoài node
                      x={w / 2 - 10} // Điều chỉnh vị trí
                      y={-h / 2 + 10} // Điều chỉnh vị trí
                      onClick={(e) => {
                        e.cancelBubble = true; // Ngăn không cho click này chọn node
                        window.open((style as any).hyperlink, '_blank', 'noopener,noreferrer');
                      }}
                      onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }}
                      onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}
                      title={`Mở link: ${(style as any).hyperlink}`}
                    >
                      {/* Vòng tròn nền nhỏ */}
                      <Circle radius={9} fill="#E0E7FF" stroke="#4F46E5" strokeWidth={1} />
                      {/* Icon Link (SVG Path) */}
                      <Path 
                        data="M9.25 10.75a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-1.5a.75.75 0 0 0-1.5 0v1.5h-1.5a.75.75 0 0 0 0 1.5h1.5v1.5Z M3.75 5.5a2 2 0 0 1 2-2h4.5a2 2 0 0 1 2 2v1a.75.75 0 0 0 1.5 0v-1a3.5 3.5 0 0 0-3.5-3.5h-4.5A3.5 3.5 0 0 0 2.25 5.5v5A3.5 3.5 0 0 0 5.75 14h1a.75.75 0 0 0 0-1.5h-1a2 2 0 0 1-2-2v-5Z"
                        fill="#4F46E5"
                        scale={{ x: 0.8, y: 0.8 }}
                        offsetX={10} // Căn giữa icon
                        offsetY={10} // Căn giữa icon
                      />
                    </Group>
                  )}
                  </Group>
                );
              })}
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(0, 100, 255, 0.3)"
                stroke="#0064FF"
                strokeWidth={1}
                visible={selectionRect.visible}
              />
            </Layer>
          </Stage>
          {isFormattingToolbarOpen && (
            <FormattingToolbar
              selectedIds={selectedNodeIds}
              currentNode={currentNode}
              currentBackgroundColor={backgroundColor}
              globalStructure={globalStructure}
              activeColorThemeId={activeColorThemeId}
              
              onApplyLayout={(structure) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                setGlobalStore({ globalStructure: structure });
                handleLayout(false);
                useEditorStore.setState({ isDirty: true });
              }}
              onSetBackgroundColor={(color) => {
                 handleSetBackgroundColor(color);
                 useEditorStore.setState({ isDirty: true });
              }}
              onSetGlobalFont={(font) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                useEditorStore.setState({ globalFont: font, isDirty: true });
              }}
              onSetBranchLineWidth={(width) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                useEditorStore.setState({ branchLineWidth: width, isDirty: true });
              }}
              onToggleColoredBranch={(state) => handleToggleColoredBranch(state)}
              onSetGlobalBranchColor={handleSetGlobalBranchColor}
              onSetActiveColorTheme={(themeName) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                setGlobalStore({ activeColorThemeId: themeName });
                setBackgroundColor(colorThemes[themeName as keyof typeof colorThemes].background);
              }}
              
              onUpdateNode={handleUpdateNode}
              onApplyQuickStyle={handleApplyQuickStyle}
              onCopyStyle={handleCopyStyle}
              onPasteStyle={handlePasteStyle}
              onResetStyle={handleResetStyle}
            />
          )}
        </div>
      </div>
    </>
  );
}