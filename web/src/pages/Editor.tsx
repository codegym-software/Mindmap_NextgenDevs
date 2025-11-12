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

// Đường dẫn tương đối
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

import {
  BeMindmapContent,
  BeMindmapDoc,
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
} from '../services/dataMapper';

// [MỚI GĐ 9] Định nghĩa cấu trúc Patch (FE-to-FE)
// Dựa trên DTO `BroadcastPatch` của BE (GĐ 8)
type BroadcastPatch = {
  type: string;
  payload: any; // Dữ liệu là JSON, do FE gửi và FE nhận
  senderId: string;
};

// [KHÔNG ĐỔI]
type BeGuestDoc = {
  id: string;
  name: string;
  content: BeMindmapContent;
};
const GUEST_BUCKET = 'mm_guest_docs';
const PADDING_X = 20,
  PADDING_Y = 12;
const LINE_HEIGHT_MULTIPLIER = 1.3;

// =================================================================================
// Component
// =================================================================================

// [KHÔNG ĐỔI] loadGuestDoc
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

// [KHÔNG ĐỔI] saveGuestDoc
function saveGuestDoc(
  id: string,
  name: string,
  feNodes: FeNodeData[],
  feEdges: EdgeData[]
) {
  try {
    const beContent = normalizeContentFEtoBE(feNodes, feEdges, {
      layoutMode: useEditorStore.getState().globalStructure,
      theme: 'light',
    });
    const all = JSON.parse(localStorage.getItem(GUEST_BUCKET) || '{}');
    const beDoc: BeGuestDoc = { id: id, name: name, content: beContent };
    all[id] = beDoc;
    localStorage.setItem(GUEST_BUCKET, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving guest doc:', e);
  }
}

// [KHÔNG ĐỔI] calculateNodeBox
function calculateNodeBox(
  node: NodeData,
  style: NodeData
) {
  const { fontSize, nodeLength, nodeText, textCase, shape } = style;

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
    w = maxWidth + PADDING_X * 2;
    w = Math.max(w, 80);
    wrappedLines = processedText.split('\n');
  } else {
    w = Number(nodeLength) || 150;
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
        if (testWidth > w - PADDING_X * 2) {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
          while (measureWidth(currentLine) > w - PADDING_X * 2) {
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

  if (shape === 'diamond') {
    w = Math.max(w, h);
    h = w;
  }

  return { w, h, textToRender: wrappedLines.join('\n'), finalFontSize };
}

export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { toggleTheme } = useTheme();
  // [MỚI GĐ 9] Lấy `getAccessToken` để xác thực WebSocket
  const { isAuthed, login, getAccessToken } = useAuth();
  const { createGuest } = useLocalMindmap();
  const isGuest = !!id && id.startsWith('guest-');

  // State từ store (Không thay đổi)
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
  } = useEditorStore();

  // State nội bộ (Không thay đổi)
  const [name, setName] = useState('Loading...');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFormattingToolbarOpen, setFormattingToolbarOpen] = useState(true);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 56,
  });
  const [pos, setPos] = useState({
    x: window.innerWidth / 2,
    y: (window.innerHeight - 56) / 2,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
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

  const stageRef = useRef<any>(null);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);
  // [MỚI GĐ 9] Ref để giữ đối tượng WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  const activeTheme =
    colorThemes[activeColorThemeId as keyof typeof colorThemes];

  // Map (Không thay đổi)
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const nodesWithChildren = useMemo(
    () => new Set(edges.map((e) => e.from)),
    [edges]
  );

  // Lấy node object hiện tại (Không thay đổi)
  const currentNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeMap.get(selectedNodeId) || null;
  }, [selectedNodeId, nodeMap]);

  // Logic tính toán style (Không thay đổi)
  const computedNodeStyles = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((node) => {
      map.set(node.id, getNodeComputedStyle(node, activeTheme, globalFont));
    });
    return map;
  }, [nodes, activeTheme, globalFont]);

  // Logic tính toán kích thước (Không thay đổi)
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

  // [KHÔNG ĐỔI] Logic Debounce (GĐ 7)
  const debouncedPushHistory = useDebouncedCallback(() => {
    const { nodes, edges } = useEditorStore.getState();
    pushHistory(nodes, edges);
  }, 500);

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
  }, 5000);

  // [KHÔNG ĐỔI] Resize (GĐ 5)
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 56,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [KHÔNG ĐỔI] Logic Load Dữ liệu (GĐ 5 Fix)
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
          clearHistory();
          setGraph(data.nodes, data.edges);
          pushHistory(data.nodes, data.edges);
          setGlobalStore({
            globalStructure: (data.layoutMode as GlobalStructure) || 'mindmap',
          });

          const theme =
            colorThemes[activeColorThemeId as keyof typeof colorThemes];
          setBackgroundColor(theme.background);
          setSelectedNodeId('root');
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
    id,
    isAuthed,
    navigate,
    addToast,
    clearHistory,
    setGraph,
    pushHistory,
    activeColorThemeId,
    setGlobalStore,
    isGuest,
    createGuest,
  ]);

  // [ĐÃ XÓA GĐ 7] Logic Auto-save (1.5s)

  // [KHÔNG ĐỔI] Logic Save thủ công (GĐ 6)
  const handleSave = () => {
    if (!isAuthed) {
      addToast('Vui lòng đăng nhập để lưu mindmap.', 'info');
      login();
    } else if (id) {
      const content = { nodes: nodes, edges };
      mindmapsApi
        .update(id, { name, content })
        .then(() => addToast('Đã lưu mindmap!', 'success'))
        .catch((e) => {
          console.error('Save failed:', e);
          addToast('Lưu thất bại', 'error');
        });
    }
  };

  // [KHÔNG ĐỔI] Logic tạo Guest mới (GĐ 5 Fix)
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

  // [KHÔNG ĐỔI] Lắng nghe sự kiện tạo mới
  useEffect(() => {
    const createHandler = () => handleCreateNew();
    window.addEventListener('mm:create', createHandler);
    return () => window.removeEventListener('mm:create', createHandler);
  }, [handleCreateNew]);

  /**
   * [MỚI GĐ 9] Hàm helper để gửi Patch (Bản vá)
   */
  const sendPatch = useCallback((type: string, payload: any) => {
    // Chỉ gửi nếu WS tồn tại và đang mở
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type, payload }));
      } catch (e) {
        console.error('Lỗi khi gửi WebSocket patch:', e);
      }
    }
  }, []); // Ref là stable, không cần deps

  /**
   * [MỚI GĐ 9] Logic kết nối WebSocket
   */
  useEffect(() => {
    // Chỉ kết nối nếu có ID, đã đăng nhập, và không phải Guest
    if (!id || !isAuthed || isGuest || !isDataLoaded) {
      return;
    }

    let isConnecting = true; // Cờ để tránh cleanup lỗi khi đang kết nối

    const connect = async () => {
      const token = await getAccessToken();
      if (!token || !isMounted) return;

      // TODO: Thay 'localhost:8081' bằng biến môi trường (VITE_WS_URL)
      const wsUrl = `ws://localhost:8081/ws/mindmap/${id}?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      isConnecting = false;

      ws.onopen = () => {
        console.log(`WebSocket connected to mindmap: ${id}`);
        // addToast("Đã kết nối cộng tác.", "info");
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected from mindmap: ${id}`);
        wsRef.current = null;
        // (Có thể thêm logic tự động kết nối lại ở đây)
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        addToast('Lỗi kết nối cộng tác.', 'error');
      };

      // === [GĐ 9] LOGIC NHẬN PATCH ===
      ws.onmessage = (event) => {
        try {
          const message: BroadcastPatch = JSON.parse(event.data);
          const { type, payload } = message;

          // Lấy trạng thái MỚI NHẤT từ store (RẤT QUAN TRỌNG)
          const { nodes: currentNodes, edges: currentEdges } =
            useEditorStore.getState();

          // Xử lý các loại patch
          // Quan trọng: KHÔNG GỌI `pushHistory` hay `debouncedPushHistory` ở đây
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
              break;
            }

            case 'NODE_CREATE': {
              const { node: feNode, edge: feEdge } = payload;
              setGraph([...currentNodes, feNode], [...currentEdges, feEdge]);
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
              break;
            }

            case 'NODE_STYLE_UPDATE': {
              const { id: nodeId, updates } = payload;
              const newNodes = currentNodes.map((n) =>
                n.id === nodeId ? { ...n, ...updates } : n
              );
              setGraph(newNodes, currentEdges);
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
              break;
            }

            case 'NODE_STYLE_PASTE': {
              const { id: nodeId, style } = payload;
              const newNodes = currentNodes.map((n) =>
                n.id === nodeId ? { ...n, ...style } : n
              );
              setGraph(newNodes, currentEdges);
              break;
            }

            case 'NODE_STYLE_RESET': {
              const { id: nodeId, resetStyle } = payload;
              const newNodes = currentNodes.map((n) =>
                n.id === nodeId ? { ...n, ...resetStyle } : n
              );
              setGraph(newNodes, currentEdges);
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

            default:
              console.warn('Unknown WebSocket patch type:', type);
          }
        } catch (e) {
          console.error('Lỗi khi xử lý tin nhắn WebSocket:', e);
        }
      };
    };

    let isMounted = true;
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
    // getAccessToken là stable (từ useCallback), isGuest là hằng số
  }, [id, isAuthed, isDataLoaded, getAccessToken, addToast, setGraph]);

  // ================================================
  // Style & Layout Logic (KHÔNG THAY ĐỔI)
  // ================================================

  const handleLayout = useCallback(() => {
    const { globalStructure, nodes, edges } = useEditorStore.getState();
    const layoutType = globalStructure;
    // ... (logic giữ nguyên) ...
    const g = new dagre.graphlib.Graph();
    const rankdir = layoutType === 'org' ? 'TB' : 'LR';
    g.setGraph({ rankdir: rankdir, nodesep: 50, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));
    const nodesToLayout = nodes.filter((n) => n.id === 'root' || n.parentId);
    const nodesToLayoutIds = new Set(nodesToLayout.map((n) => n.id));
    nodesToLayout.forEach((node) => {
      const visual = nodeVisuals.get(node.id);
      const w = visual?.box.w || 100;
      const h = visual?.box.h || 50;
      g.setNode(node.id, { label: node.nodeText, width: w, height: h });
    });
    edges
      .filter((e) => nodesToLayoutIds.has(e.from) && nodesToLayoutIds.has(e.to))
      .forEach((edge) => g.setEdge(edge.from, edge.to));
    dagre.layout(g);
    let newNodes = [...nodes];
    if (layoutType === 'mindmap') {
      const root = nodes.find((n) => n.id === 'root');
      if (!root) return;
      const edgesFrom = (id: string) =>
        edges.filter((e) => e.from === id).map((e) => e.to);
      const posMap = new Map<
        string,
        { x: number; y: number; side?: 'left' | 'right' }
      >();
      posMap.set(root.id, { x: 0, y: 0, side: 'right' });
      const horizontalGap = 200;
      const verticalGap = 80;
      const rootChildren = edgesFrom(root.id);
      const leftChildren: string[] = [];
      const rightChildren: string[] = [];
      rootChildren.forEach((child, i) => {
        if (i % 2 === 0) rightChildren.push(child);
        else leftChildren.push(child);
      });
      const placeSide = (
        parentId: string,
        children: string[],
        depth: number,
        side: 'left' | 'right'
      ) => {
        const direction = side === 'right' ? 1 : -1;
        const startY = -(children.length - 1) * (verticalGap / 2);
        children.forEach((childId, i) => {
          const y = startY + i * verticalGap;
          const x = direction * horizontalGap * depth;
          posMap.set(childId, { x, y, side: side });
          const grandChildren = edgesFrom(childId);
          if (grandChildren.length > 0) {
            placeSide(childId, grandChildren, depth + 1, side);
          }
        });
      };
      placeSide(root.id, rightChildren, 1, 'right');
      placeSide(root.id, leftChildren, 1, 'left');
      newNodes = nodes.map((n): NodeData => {
        const data = posMap.get(n.id);
        return data ? { ...n, x: data.x, y: data.y, side: data.side } : n;
      });
      setGraph(newNodes, edges);
    }
    if (layoutType === 'logic') {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });
      g.setDefaultEdgeLabel(() => ({}));
      nodes.forEach((n) => {
        const visual = nodeVisuals.get(n.id);
        g.setNode(n.id, {
          width: visual?.box.w || 150,
          height: visual?.box.h || 60,
        });
      });
      edges.forEach((e) => g.setEdge(e.from, e.to));
      dagre.layout(g);
      newNodes = nodes.map((n): NodeData => {
        const pos = g.node(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y, side: 'right' } : n;
      });
      setGraph(newNodes, edges);
    }
    if (layoutType === 'org') {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 });
      g.setDefaultEdgeLabel(() => ({}));
      nodes.forEach((n) => {
        const visual = nodeVisuals.get(n.id);
        g.setNode(n.id, {
          width: visual?.box.w || 150,
          height: visual?.box.h || 60,
        });
      });
      edges.forEach((e) => g.setEdge(e.from, e.to));
      dagre.layout(g);
      newNodes = nodes.map((n): NodeData => {
        const pos = g.node(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y, side: 'right' } : n;
      });
      setGraph(newNodes, edges);
    }
    if (newNodes.length === 0) {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight - 56;
      setDimensions({ width: currentWidth, height: currentHeight });
      setScale(1);
      setPos({ x: currentWidth / 2, y: currentHeight / 2 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    newNodes.forEach((node) => {
      const visual = nodeVisuals.get(node.id);
      const w = visual?.box.w || 100;
      const h = visual?.box.h || 50;
      const x = node.x;
      const y = node.y;
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minY = Math.min(minY, y - h / 2);
      maxY = Math.max(maxY, y + h / 2);
    });
    const boundsWidth = maxX - minX + 80;
    const boundsHeight = maxY - minY + 80;
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight - 56;
    setDimensions({ width: currentWidth, height: currentHeight });
    if (boundsWidth <= 0 || boundsHeight <= 0) {
      setScale(1);
      setPos({
        x: currentWidth / 2 - newNodes[0].x,
        y: currentHeight / 2 - newNodes[0].y,
      });
      return;
    }
    const scaleX = currentWidth / boundsWidth;
    const scaleY = currentHeight / boundsHeight;
    const newScale = Math.min(1, scaleX, scaleY);
    const boundsCenterX = minX + (maxX - minX) / 2;
    const boundsCenterY = minY + (maxY - minY) / 2;
    const newX = currentWidth / 2 - boundsCenterX * newScale;
    const newY = currentHeight / 2 - boundsCenterY * newScale;
    setScale(newScale);
    setPos({ x: newX, y: newY });
  }, [nodeVisuals, setGraph, edges]);

  // ================================================
  // Node Actions [CẬP NHẬT GĐ 9] (Thêm sendPatch)
  // ================================================

  const startEditing = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
    setTimeout(() => {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }, 50);
  }, []);

  const stopEditing = useCallback(
    (save: boolean) => {
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
        setTimeout(handleLayout, 50);
        debouncedPushHistory();
        debouncedPersistData();
        // [MỚI GĐ 9] Gửi patch
        sendPatch('NODE_TEXT_CHANGE', { id: editingNodeId, text: newText });
      }
    },
    [
      editingNodeId,
      nodes,
      edges,
      setGraph,
      handleLayout,
      debouncedPushHistory,
      debouncedPersistData,
      sendPatch, // Thêm
    ]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentVisual = nodeVisuals.get(parentId);
      if (!parentVisual) return;
      const parentStyle = parentVisual.style;

      const newId = 'n' + Date.now();
      const newNodeData: NodeData = {
        id: newId,
        nodeText: '',
        x: parentStyle.x,
        y: parentStyle.y,
        parentId,
        side: parentStyle.side,
        branchColor: parentStyle.branchColor,
        branchLineEnd: parentStyle.branchLineEnd,
        branchLineStyle: parentStyle.branchLineStyle,
        branchLineThickness: parentStyle.branchLineThickness,
      };
      const newEdgeData: EdgeData = {
        id: `e-${newId}`,
        from: parentId,
        to: newId,
      };

      const newNodes = [...nodes, newNodeData];
      const newEdges = [...edges, newEdgeData];

      setGraph(newNodes, newEdges);
      startEditing(newId);
      setTimeout(handleLayout, 50);
      debouncedPushHistory();
      debouncedPersistData();
      // [MỚI GĐ 9] Gửi patch (gửi cả node và edge)
      sendPatch('NODE_CREATE', { node: newNodeData, edge: newEdgeData });
    },
    [
      nodes,
      edges,
      setGraph,
      nodeVisuals,
      startEditing,
      handleLayout,
      debouncedPushHistory,
      debouncedPersistData,
      sendPatch, // Thêm
    ]
  );

  const handleAddSibling = useCallback(
    (nodeId: string) => {
      if (nodeId === 'root') {
        handleAddChild('root');
        return;
      }
      const parentId = nodes.find((n) => n.id === nodeId)?.parentId;
      if (parentId) handleAddChild(parentId);
    },
    [nodes, handleAddChild]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === 'root' || !selectedNodeId) return;
      const nodesToDelete = new Set<string>([nodeId]);
      const findChildren = (id: string) => {
        edges.forEach((e) => {
          if (e.from === id) {
            nodesToDelete.add(e.to);
            findChildren(e.to);
          }
        });
      };
      findChildren(nodeId);

      const parentId = nodes.find((n) => n.id === nodeId)?.parentId ?? 'root';
      const newNodes = nodes.filter((n) => !nodesToDelete.has(n.id));
      const newEdges = edges.filter(
        (e) => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to)
      );

      setGraph(newNodes, newEdges);
      setSelectedNodeId(parentId);
      setTimeout(handleLayout, 50);
      debouncedPushHistory();
      debouncedPersistData();
      // [MỚI GĐ 9] Gửi patch
      sendPatch('NODE_DELETE', { nodeIds: Array.from(nodesToDelete) });
    },
    [
      nodes,
      edges,
      setGraph,
      selectedNodeId,
      handleLayout,
      debouncedPushHistory,
      debouncedPersistData,
      sendPatch, // Thêm
    ]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // ... (logic không đổi) ...
      if (editingNodeId) return;
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      )
        return;
      if (!selectedNodeId) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild(selectedNodeId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSibling(selectedNodeId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteNode(selectedNodeId);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'F2') {
        e.preventDefault();
        startEditing(selectedNodeId);
      } else if (
        e.key.length === 1 &&
        /^[a-zA-Z0-9\S]$/.test(e.key) &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        startEditing(selectedNodeId);
        setTimeout(() => {
          if (editingInputRef.current) editingInputRef.current.value = e.key;
        }, 50);
      }
    },
    [
      editingNodeId,
      selectedNodeId,
      handleAddChild,
      handleAddSibling,
      handleDeleteNode,
      undo,
      redo,
      startEditing,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ================================================
  // Drag & Drop [CẬP NHẬT GĐ 9] (Thêm sendPatch)
  // ================================================

  const handleDragStart = (nodeId: string) => {
    pushHistory(nodes, edges);
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
      // [MỚI GĐ 9] Gửi patch
      sendPatch('NODE_REPARENT', {
        nodeId: draggedNodeId,
        newParentId: newParentId,
        x: finalX,
        y: finalY,
        side: parentSide,
      });
    } else {
      // Kéo
      const newNodes = nodes.map((n) => {
        if (n.id === draggedNodeId) {
          if (n.parentId) {
            return { ...n, x: finalX, y: finalY };
          }
          return {
            ...n,
            x: finalX,
            y: finalY,
            parentId: undefined,
            side: undefined,
          };
        }
        return n;
      });
      setGraph(newNodes, edges);
      // [MỚI GĐ 9] Gửi patch
      sendPatch('NODE_MOVE', { id: draggedNodeId, x: finalX, y: finalY });
    }

    setDropTargetId(null);
    setTimeout(handleLayout, 50);

    // [FIX GĐ 7] Gọi debouncer sau khi kết thúc kéo
    debouncedPushHistory();
    debouncedPersistData();
  };

  // ================================================
  // Handlers cho Toolbar [CẬP NHẬT GĐ 9] (Thêm sendPatch)
  // ================================================

  const handleUpdateNode = (id: string, updates: Partial<NodeData>) => {
    const newNodes = nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    setGraph(newNodes, edges);

    if (updates.nodeLength) {
      setTimeout(handleLayout, 50);
    }
    debouncedPushHistory();
    debouncedPersistData();
    // [MỚI GĐ 9] Gửi patch
    sendPatch('NODE_STYLE_UPDATE', { id, updates });
  };

  const handleApplyQuickStyle = (styleId: QuickStyleId) => {
    if (!selectedNodeId) return;
    const node = nodeMap.get(selectedNodeId);
    if (!node) return;

    const resetStyle = applyNodeDefaults(node, activeTheme);
    const newNodes = nodes.map((n) =>
      n.id === selectedNodeId
        ? {
            ...n,
            ...resetStyle,
            quickStyleId: styleId,
          }
        : n
    );
    setGraph(newNodes, edges);
    setTimeout(handleLayout, 50);
    debouncedPushHistory();
    debouncedPersistData();
    // [MỚI GĐ 9] Gửi patch
    sendPatch('NODE_QUICK_STYLE_APPLY', {
      id: selectedNodeId,
      styleId,
      resetStyle,
    });
  };

  const handleCopyStyle = () => {
    if (!currentNode) return;
    const styleToCopy: Partial<NodeData> = {};
    (
      Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>
    ).forEach((key) => {
      if (currentNode[key] !== undefined) {
        (styleToCopy as any)[key] = currentNode[key];
      }
    });
    setStyleClipboard(styleToCopy);
    addToast('Đã sao chép kiểu!', 'success');
  };

  const handlePasteStyle = () => {
    if (!selectedNodeId || !styleClipboard) return;
    const newNodes = nodes.map((n) =>
      n.id === selectedNodeId ? { ...n, ...styleClipboard } : n
    );
    setGraph(newNodes, edges);
    setTimeout(handleLayout, 50);
    debouncedPushHistory();
    debouncedPersistData();
    // [MỚI GĐ 9] Gửi patch
    sendPatch('NODE_STYLE_PASTE', { id: selectedNodeId, style: styleClipboard });
  };

  const handleResetStyle = () => {
    if (!selectedNodeId || !currentNode) return;
    const resetStyle = applyNodeDefaults(currentNode, activeTheme);
    const newNodes = nodes.map((n) =>
      n.id === selectedNodeId ? { ...n, ...resetStyle } : n
    );
    setGraph(newNodes, edges);
    setTimeout(handleLayout, 50);
    debouncedPushHistory();
    debouncedPersistData();
    // [MỚI GĐ 9] Gửi patch
    sendPatch('NODE_STYLE_RESET', { id: selectedNodeId, resetStyle });
  };

  // ================================================
  // Logic Collapse [CẬP NHẬT GĐ 9] (Thêm sendPatch)
  // ================================================

  const handleToggleCollapse = useCallback(
    (e: any, nodeId: string) => {
      e.cancelBubble = true;
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
      );
      setGraph(newNodes, edges);
      debouncedPushHistory();
      debouncedPersistData();
      // [MỚI GĐ 9] Gửi patch
      sendPatch('NODE_TOGGLE_COLLAPSE', { id: nodeId });
    },
    [
      nodes,
      edges,
      setGraph,
      debouncedPushHistory,
      debouncedPersistData,
      sendPatch, // Thêm
    ]
  );

  // ... (Toàn bộ logic isNodeVisible, visibleNodes, descendantCounts KHÔNG THAY ĐỔI) ...
  const isNodeVisible = useCallback(
    (nodeId: string): boolean => {
      const node = nodeMap.get(nodeId);
      if (!node) return false;
      if (nodeId === 'root' || !node.parentId) return true;
      const parent = nodeMap.get(node.parentId);
      if (!parent) return true;
      if (parent.collapsed) return false;
      if (!parent.parentId) return true;
      return isNodeVisible(parent.parentId);
    },
    [nodeMap]
  );
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
  const descendantCounts = useMemo(() => {
    const counts = new Map<string, number>();
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
      return total;
    };
    for (const nodeId of nodeMap.keys()) {
      counts.set(nodeId, dfs(nodeId));
    }
    return counts;
  }, [edges, nodeMap]);

  // [KHÔNG ĐỔI] Vị trí Text Area
  const editingNodePosition = useMemo(() => {
    if (!editingNodeId) return null;
    const visual = nodeVisuals.get(editingNodeId);
    if (!visual || !stageRef.current) return null;
    const { style } = visual;
    const { w, h, finalFontSize } = visual.box;
    const stageRect = stageRef.current.container().getBoundingClientRect();
    const absPos = stageRef.current
      .getAbsoluteTransform()
      .point({ x: style.x, y: style.y });
    return {
      left: stageRect.left + absPos.x - w / 2,
      top: stageRect.top + absPos.y - h / 2,
      width: w,
      height: h,
      fontSize: finalFontSize,
      fontStyle: style.fontWeight,
      textAlign: style.textAlign,
      color: style.textColor,
    };
  }, [editingNodeId, nodeVisuals, scale, pos]);

  // ================================================
  // Render (KHÔNG THAY ĐỔI)
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
          name={name}
          onNameChange={setName}
          onCommitName={() => {
            // [GĐ 7] Kích hoạt lưu 5s khi tên thay đổi
            debouncedPersistData();
            // [GĐ 9] Gửi patch tên
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
          onToggleFormattingToolbar={() =>
            setFormattingToolbarOpen(!isFormattingToolbarOpen)
          }
        />
        <Sidebar />

        {editingNodeId && editingNodePosition && (
          <textarea
            ref={editingInputRef}
            defaultValue={nodes.find((n) => n.id === editingNodeId)?.nodeText}
            onBlur={() => stopEditing(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                stopEditing(true);
              } else if (e.key === 'Escape') {
                stopEditing(false);
              }
            }}
            style={{
              position: 'absolute',
              left: editingNodePosition.left,
              top: editingNodePosition.top,
              width: editingNodePosition.width,
              height: editingNodePosition.height,
              fontSize: `${editingNodePosition.fontSize}px`,
              fontWeight: editingNodePosition.fontStyle,
              lineHeight: LINE_HEIGHT_MULTIPLIER,
              padding: `${PADDING_Y}px ${PADDING_X}px`,
              textAlign: editingNodePosition.textAlign,
              color: editingNodePosition.color || '#333333',
              backgroundColor: 'white',
            }}
            className="absolute z-50 bg-white rounded-md outline-none resize-none ring-2 ring-blue-500/70 shadow-lg"
          />
        )}

        <div
          className="w-full h-full pt-14 relative"
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
              e.evt.preventDefault();
              const scaleBy = 1.05;
              const stage = e.target.getStage();
              if (!stage) return;
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
            }}
            onMouseDown={(e) => {
              if (
                e.evt.button === 1 ||
                (e.evt.button === 0 && e.target === e.target.getStage())
              ) {
                setIsPanning(true);
              }
              if (e.target === e.target.getStage()) {
                setSelectedNodeId(null);
                if (editingNodeId) stopEditing(true);
              }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseMove={(e) => {
              if (isPanning)
                setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY });
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
              debouncedPushHistory();
              debouncedPersistData();
              // [MỚI GĐ 9] Gửi patch (node nổi, không có edge)
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
                  p1 = {
                    x:
                      fromStyle.x +
                      (fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2),
                    y: fromStyle.y,
                  };
                  p4 = {
                    x:
                      toStyle.x +
                      (toSide === 'left' ? toBox.w / 2 : -toBox.w / 2),
                    y: toStyle.y,
                  };
                  points = [
                    p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y,
                  ];
                } else {
                  p1 = {
                    x:
                      fromStyle.x +
                      (fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2),
                    y: fromStyle.y,
                  };
                  p4 = {
                    x:
                      toStyle.x +
                      (toSide === 'left' ? toBox.w / 2 : -toBox.w / 2),
                    y: toStyle.y,
                  };
                  points = [
                    p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y,
                  ];
                }
                const strokeColor = isColoredBranch
                  ? toStyle.branchColor || '#94A3B8'
                  : useEditorStore.getState().globalBranchColor;
                const thicknessMap = { thin: 1, normal: 2, thick: 4 };
                const strokeWidth =
                  thicknessMap[
                    toStyle.branchLineThickness || 'normal'
                  ] || 2;
                const isBezier =
                  toStyle.branchLineStyle === 'bezier' &&
                  globalStructure !== 'org';
                const lineProps = {
                  points: points,
                  stroke: strokeColor,
                  strokeWidth: strokeWidth,
                  bezier: isBezier,
                  lineCap: 'round' as const,
                  lineJoin: 'round' as const,
                };
                if (toStyle.branchLineEnd === 'arrow') {
                  return (
                    <Arrow
                      {...lineProps}
                      key={edge.id}
                      pointerLength={8}
                      pointerWidth={6}
                      fill={strokeColor}
                    />
                  );
                }
                return <Line {...lineProps} key={edge.id} />;
              })}

              {visibleNodes.map((node) => {
                const visual = nodeVisuals.get(node.id);
                if (!visual) return null;
                const { style, box } = visual;
                const { w, h, textToRender, finalFontSize } = box;
                const isSelected = node.id === selectedNodeId;
                const isDropTarget = node.id === dropTargetId;
                const hasChildren = nodesWithChildren.has(node.id);
                const shapeProps = {
                  width: w,
                  height: h,
                  offsetX: w / 2,
                  offsetY: h / 2,
                  fill: style.color,
                  stroke: isDropTarget
                    ? '#34d399'
                    : isSelected
                    ? '#3b82f6'
                    : style.borderColor,
                  strokeWidth: isDropTarget
                    ? 4
                    : isSelected
                    ? 3
                    : style.borderWidth || 0,
                  dash:
                    style.borderStyle === 'dashed'
                      ? [8, 4]
                      : style.borderStyle === 'dotted'
                      ? [2, 3]
                      : undefined,
                };
                return (
                  <Group
                    key={node.id}
                    id={node.id}
                    x={style.x}
                    y={style.y}
                    draggable
                    onDragStart={() => handleDragStart(node.id)}
                    onDragMove={(e) => handleDragMove(e, node.id)}
                    onDragEnd={(e) => handleDragEnd(e, node.id)}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedNodeId(node.id);
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      startEditing(node.id);
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    {style.shape === 'diamond' && (
                      <Path
                        {...shapeProps}
                        data={`M${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} L0 ${
                          h / 2
                        } Z`}
                        offsetX={w / 2}
                        offsetY={h / 2}
                      />
                    )}
                    {(style.shape === 'rectangle' ||
                      style.shape === 'roundedRect') && (
                      <Rect
                        {...shapeProps}
                        cornerRadius={style.shape === 'roundedRect' ? 8 : 0}
                      />
                    )}

                    <Text
                      visible={editingNodeId !== node.id}
                      text={textToRender || '(...)'}
                      width={w}
                      height={h}
                      offsetX={w / 2}
                      offsetY={h / 2}
                      align={style.textAlign}
                      verticalAlign="middle"
                      fill={style.textColor}
                      padding={PADDING_Y}
                      listening={false}
                      fontSize={finalFontSize}
                      fontStyle={
                        style.fontStyle === 'italic'
                          ? 'italic'
                          : style.fontWeight
                      }
                      fontFamily={style.fontFamily}
                      textDecoration={
                        style.textDecoration === 'none'
                          ? undefined
                          : style.textDecoration
                      }
                      lineHeight={LINE_HEIGHT_MULTIPLIER}
                    />

                    {hasChildren && (
                      <Group
                        x={style.side === 'left' ? -w / 2 : w / 2}
                        y={0}
                        onClick={(e) => handleToggleCollapse(e, node.id)}
                        onMouseEnter={(e) => {
                          const stage = e.target.getStage();
                          if (stage)
                            stage.container().style.cursor = 'pointer';
                        }}
                        onMouseLeave={(e) => {
                          const stage = e.target.getStage();
                          if (stage) stage.container().style.cursor = 'default';
                        }}
                      >
                        <Circle
                          radius={8}
                          fill="#3b82f6"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                        {node.collapsed ? (
                          <Text
                            text={`${descendantCounts.get(node.id) || 0}`}
                            fontSize={9}
                            fill="#FFFFFF"
                            align="center"
                            verticalAlign="middle"
                            width={16}
                            height={16}
                            offsetX={8}
                            offsetY={8}
                            fontStyle="bold"
                            listening={false}
                          />
                        ) : (
                          <Path
                            data="M-4 0 H4"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            lineCap="round"
                          />
                        )}
                      </Group>
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
          {isFormattingToolbarOpen && (
            <FormattingToolbar
              selectedId={selectedNodeId}
              currentNode={currentNode}
              currentBackgroundColor={backgroundColor}
              globalStructure={globalStructure}
              activeColorThemeId={activeColorThemeId}
              onApplyLayout={(structure) => {
                setGlobalStore({ globalStructure: structure });
                handleLayout();
                // [MỚI GĐ 9] Gửi patch
                sendPatch('LAYOUT_CHANGE', { structure });
              }}
              onSetBackgroundColor={(color) => {
                setBackgroundColor(color);
                // [MỚI GĐ 9] Gửi patch
                sendPatch('BACKGROUND_CHANGE', { color });
              }}
              onSetGlobalFont={(font) => {
                setGlobalStore({ globalFont: font });
                debouncedPushHistory();
                debouncedPersistData();
                // [MỚI GĐ 9] Gửi patch
                sendPatch('FONT_CHANGE', { font });
              }}
              onSetBranchLineWidth={(width) => {
                setGlobalStore({ branchLineWidth: width });
                debouncedPushHistory();
                debouncedPersistData();
                // [MỚI GĐ 9] Gửi patch
                sendPatch('LINE_WIDTH_CHANGE', { width });
              }}
              onToggleColoredBranch={(state) => {
                setGlobalStore({ isColoredBranch: state });
                debouncedPushHistory();
                debouncedPersistData();
                // [MỚI GĐ 9] Gửi patch
                sendPatch('LINE_COLOR_TOGGLE', { state });
              }}
              onSetActiveColorTheme={(themeName) => {
                setGlobalStore({ activeColorThemeId: themeName });
                setBackgroundColor(
                  colorThemes[themeName as keyof typeof colorThemes].background
                );
                debouncedPushHistory();
                debouncedPersistData();
                // [MỚI GĐ 9] Gửi patch
                sendPatch('THEME_CHANGE', { themeName });
              }}
              onUpdateNode={(id, updates) => handleUpdateNode(id, updates)}
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