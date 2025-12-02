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
  Image as KonvaImage,
} from 'react-konva';
import { SquareArrowOutUpRight } from 'lucide-react'; 
import * as dagre from 'dagre';
import useImage from 'use-image'; 
import { useDebouncedCallback } from 'use-debounce';

// Sử dụng alias ../ để import an toàn
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
  NodeTopology
} from '../app/store/useEditorStore';
import { mindmapsApi, FeMindmapDoc } from '../services/mindmapsApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import Spinner from '../components/common/Spinner';
import { useLocalMindmap } from '../hooks/useLocalMindmap';
import { useMindmapsStore } from '../app/store/useMindmapsStore';
import Boundary from '../features/editor/Boundary';

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

const BRANCH_COLORS_PALETTE = [
  '#475569','#EF4444', '#F97316', '#FACC15', '#22C55E',
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

function calculateNodeBox(node: NodeData, style: NodeData) {
  // [SỬA LỖI] Thêm imageUrl vào destructuring
  const { fontSize, nodeLength, nodeText, textCase, shape, imageUrl } = style; 
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
    w = Number(nodeLength) || 250;
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

  let imageHeight = 0;
  let imageWidthDisplay = 0;
   
  if (imageUrl) {
    // Nếu có ảnh, node sẽ rộng ra hoặc ảnh fit theo width của node
    // Mặc định ảnh sẽ fit width của node (trừ padding)
    imageWidthDisplay = w - (PADDING_X * 2) - (borderWidth * 2);
    // Giả sử tỉ lệ 16:9 hoặc lấy tỉ lệ thật nếu đã lưu trong node
    // Ở đây tạm tính chiều cao ảnh khoảng 2/3 chiều rộng hiển thị cho đẹp nếu chưa load xong
    // Nếu đã có imageHeight từ store (sau khi load) thì dùng
    imageHeight = imageWidthDisplay * 0.6; 
    if (style.imageHeight && style.imageWidth) {
       imageHeight = (style.imageHeight / style.imageWidth) * imageWidthDisplay;
    }
  }

  // Nếu có ảnh, chiều cao tổng sẽ bao gồm ảnh + khoảng cách (10px) + text
  // Nếu textHeight đã bao gồm padding, ta chỉ cần cộng thêm ảnh
  let totalH = h;
  if (imageUrl) {
      totalH = h + imageHeight + 10;
  }

  return { 
    w, 
    h: totalH, // Trả về tổng chiều cao
    textToRender: wrappedLines.join('\n'), 
    finalFontSize,
    imageHeight,        
    imageWidthDisplay   
  };
}

const URLImage = ({ src, x, y, width, height, onImageLoad }: any) => {
  const [image] = useImage(src);
  
  useEffect(() => {
    if (image && onImageLoad) {
      onImageLoad(image.width, image.height);
    }
  }, [image, onImageLoad]); 

  if (!image) return null;
  return <KonvaImage image={image} x={x} y={y} width={width} height={height} cornerRadius={4} />;
};

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
    activeColorThemeId,
    set: setGlobalStore,
    globalBranchColor,
    isDirty,
    toggleNodeBoundary,
  } = useEditorStore();

  const handleToggleBoundary = () => {
    if (selectedNodeIds.length === 1) {
      toggleNodeBoundary(selectedNodeIds[0]);
    }
  };

  // State nội bộ
  const [name, setName] = useState('Loading...');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isReadyToShow, setIsReadyToShow] = useState(false);
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
  const pendingLayoutRef = useRef(false);

  const stageRef = useRef<any>(null);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const activeTheme =
  colorThemes[activeColorThemeId as keyof typeof colorThemes];
  const nodeTopology = useMemo(() => {
    const topology = new Map<string, NodeTopology>();
    const nodeDataMap = new Map(nodes.map(n => [n.id, n]));
    
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    });

    const traverse = (nodeId: string, depth: number, rootBranchIndex: number, inheritedColor: string | null) => {
      const node = nodeDataMap.get(nodeId);
      let currentBaseColor = inheritedColor;

      // Logic xác định màu tại cấp 1:
      // Lấy màu toàn cục nếu chưa có màu thừa hưởng (là từ root)
      if (depth === 1 && !currentBaseColor) {
         currentBaseColor = globalBranchColor;
      }

      // Nếu node có màu riêng, nó sẽ đè màu toàn cục/thừa hưởng
      if (node?.branchColor) {
        currentBaseColor = node.branchColor;
      }

      // Fallback an toàn là Đen nếu tất cả đều null
      const effectiveColor = currentBaseColor || globalBranchColor || '#000000';

      topology.set(nodeId, { 
        depth, 
        branchBaseColor: effectiveColor 
      });
      
      const children = adj.get(nodeId) || [];
      children.forEach((childId, index) => {
        const nextBranchIndex = (nodeId === 'root') ? index : rootBranchIndex;
        traverse(childId, depth + 1, nextBranchIndex, effectiveColor);
      });
    };

    traverse('root', 0, 0, null);
    return topology;
  }, [nodes, edges, globalBranchColor]);
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
  const isSelecting = useRef(false); //cờ để biết đang kéo chọn vùng

  const selectedIdsSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  // Chọn node đầu tiên trong danh sách chọn để hiển thị style trên toolbar
  const firstSelectedId = useMemo(() => selectedNodeIds[0], [selectedNodeIds]);
  const currentNode = useMemo(() => {
    if (!firstSelectedId) return null;
    return nodeMap.get(firstSelectedId) || null;
  }, [firstSelectedId, nodeMap]);

  const setMindmapsStore = useMindmapsStore(s => s.set);
  const mindmapItems = useMindmapsStore(s => s.items);

  // Logic tính toán
  const computedNodeStyles = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((node) => {
      // Lấy thông tin topo của node hiện tại
      const topo = nodeTopology.get(node.id);
      
      // Truyền topo vào hàm tính style
      map.set(
        node.id, 
        getNodeComputedStyle(node, activeTheme, globalFont, topo)
      );
    });
    return map;
  }, [nodes, activeTheme, globalFont, nodeTopology]);

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
            globalBranchColor: data.globalBranchColor || '#94A3B8',
            activeColorThemeId: data.activeColorThemeId || 'dawn',
            backgroundColor: data.backgroundColor || '#FAFAFB', 
          });
          setBackgroundColor(data.backgroundColor || '#FAFAFB');
          if (data.nodes.length <= 1) {
             setSelectedNodeIds(['root']);
          } else {
             setSelectedNodeIds([]); 
          }
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
    } else {
       setFormattingToolbarOpen(false);
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
      return; 
    }

    let isConnecting = true;
    let isMounted = true; 

    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !isMounted) return;

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

        // === LOGIC NHẬN PATCH ===
        ws.onmessage = (event) => {
          try {
            const message: BroadcastPatch = JSON.parse(event.data);
            const { type, payload } = message;

            // Lấy state MỚI NHẤT từ store
            const { nodes: currentNodes, edges: currentEdges } =
              useEditorStore.getState();
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

  // ================================================
  // Style & Layout Logic
  // ================================================

const deepEqualNodes = (nodes1: NodeData[], nodes2: NodeData[]): boolean => {
  if (nodes1.length !== nodes2.length) return false;
  for (let i = 0; i < nodes1.length; i++) {
    const n1 = nodes1[i];
    const n2 = nodes2[i];
    if (
      n1.id !== n2.id ||
      Math.abs(n1.x - n2.x) > 0.1 || 
      Math.abs(n1.y - n2.y) > 0.1 ||
      n1.parentId !== n2.parentId ||
      n1.side !== n2.side ||
      n1.collapsed !== n2.collapsed ||
      n1.imageWidth !== n2.imageWidth || // Include image dimensions
      n1.imageHeight !== n2.imageHeight
    ) {
      return false;
    }
  }
  return true;
};

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

      const floatingRoots = newNodes.filter(
        n => (n.parentId === undefined || n.parentId === null) && n.id !== 'root'
      );

      const adjMap = new Map<string, string[]>();
      allEdges.forEach(e => {
        if (!adjMap.has(e.from)) adjMap.set(e.from, []);
        adjMap.get(e.from)!.push(e.to);
      });

      for (const floatingRoot of floatingRoots) {
        const islandNodes = new Map<string, NodeData>();
        const islandEdges: EdgeData[] = [];
        const q: NodeData[] = [floatingRoot]; 
        while (q.length > 0) {
          const current = q.shift()!;
          if (!islandNodes.has(current.id)) {
            islandNodes.set(current.id, current);
            const childrenIds = adjMap.get(current.id) || [];
            childrenIds.forEach(childId => {
              const childNode = finalNodesMap.get(childId); 
              if (childNode) {
                q.push(childNode);
                islandEdges.push({ id: `e-${childId}`, from: current.id, to: childId });
              }
            });
          }
        }

        if (islandNodes.size <= 1) continue; 

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
        
        dagre.layout(g);

        const anchorPos = finalNodesMap.get(floatingRoot.id)!; 
        const dagreRootPos = g.node(floatingRoot.id);
        const offsetX = anchorPos.x - dagreRootPos.x;
        const offsetY = anchorPos.y - dagreRootPos.y;

        islandNodes.forEach((node, id) => {
          const dagrePos = g.node(id);
          if (dagrePos) {
            const existingNode = finalNodesMap.get(id)!;
            const updatedNode = {
              ...existingNode,
              x: dagrePos.x + offsetX,
              y: dagrePos.y + offsetY,
              side: (islandLayoutDir === 'LR' ? (dagrePos.x < 0 ? 'left' : 'right') : 'right') as 'left' | 'right', 
            };
            finalNodesMap.set(id, updatedNode); 
          }
        });
      } 
      
      newNodes = Array.from(finalNodesMap.values());

      // Lấy trạng thái hiện tại của nodes từ store
      const currentNodesInStore = useEditorStore.getState().nodes;

      // Chỉ cập nhật graph nếu có sự thay đổi đáng kể về vị trí/kích thước
      if (!deepEqualNodes(newNodes, currentNodesInStore)) {
        setGraph(newNodes, edges);
      }
      
      setRootCollapse({ left: false, right: false });

      // Logic Căn giữa/Zoom 
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
    [nodeVisuals, setGraph, edges] 
  );

  const zoomStep = 1.2; 
  const handleZoomIn = useCallback(() => {
    handleSetZoom(scale * zoomStep);
  }, [scale]); 
  const handleZoomOut = useCallback(() => {
    handleSetZoom(scale / zoomStep);
  }, [scale]); 

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

    // Tính toán world point mà trung tâm màn hình đang trỏ tới
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
  handleLayout(false); 
}, [handleLayout]); 

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
      handleLayout(true); 
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
      debouncedPushHistory, debouncedPersistData, sendPatch, 
    ]
  );

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodeMap.get(parentId); 
    const parentVisual = nodeVisuals.get(parentId); 
    
    if (!parentNode || !parentVisual) return;

    const parentComputedStyle = parentVisual.style; 

    const newId = "n" + Date.now();

    const newNodeData: NodeData = { 
      id: newId, 
      nodeText: "Nội dung",
      x: parentComputedStyle.x + 40,
      y: parentComputedStyle.y + 20,
      parentId,
      side: parentComputedStyle.side, 
    };

    const styleKeys = Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>;

    const EXCLUDED_STYLES = ['color', 'borderColor', 'textColor', 'branchColor', 'quickStyleId'];

    styleKeys.forEach(key => {
      if (EXCLUDED_STYLES.includes(key)) return; 

      if (parentNode[key] !== undefined) {
        (newNodeData as any)[key] = parentNode[key];
      }
    });

    if (parentId === 'root') {
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
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout]);

  const handleAddSibling = useCallback((nodeId: string) => {
    if (nodeId === 'root') { 
      handleAddChild('root'); 
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
    
    const EXCLUDED_STYLES = ['color', 'borderColor', 'textColor', 'branchColor', 'quickStyleId'];

    styleKeys.forEach(key => {
      if (EXCLUDED_STYLES.includes(key)) return;

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
    () => { 
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

      const parentId = nodes.find((n) => n.id === idsToDelete[0])?.parentId ?? 'root';
      const newNodes = nodes.filter((n) => !nodesToDelete.has(n.id));
      const newEdges = edges.filter(
        (e) => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to)
      );
      setGraph(newNodes, newEdges);
      setSelectedNodeIds([]);
      setTimeout(() => handleLayout(true), 50);
      debouncedPushHistory();
      debouncedPersistData();
      sendPatch('NODE_DELETE', { nodeIds: Array.from(nodesToDelete) });
    },
    [
      nodes, edges, setGraph, selectedNodeIds, handleLayout, 
      debouncedPushHistory, debouncedPersistData, sendPatch,
    ]
  );

  const handleUpdateNode = (updates: Partial<NodeData>) => {
    if (selectedNodeIds.length === 0) return;

    let newNodes = [...nodes];
    const idSet = selectedIdsSet;

    const STYLE_KEYS: Array<keyof NodeData> = [
      'shape', 'color', 'borderColor', 'borderWidth', 'borderStyle',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'textColor', 'textCase', 'nodeLength',
      'branchColor', 'branchLineStyle', 'branchLineEnd', 'branchLineThickness'
    ];
    const isStyleUpdate = Object.keys(updates).some(k => STYLE_KEYS.includes(k as keyof NodeData));

    if (updates.branchColor !== undefined) {
      const updateBranchColorRecursive = (nodeId: string, color: string) => {
        if (idSet.has(nodeId)) {
          newNodes = newNodes.map(n => n.id === nodeId ? { ...n, branchColor: color } : n);
        }
        edges.forEach(e => { if (e.from === nodeId) updateBranchColorRecursive(e.to, color); });
      };
      selectedNodeIds.forEach(id => updateBranchColorRecursive(id, updates.branchColor as string));
    }
    
    newNodes = newNodes.map(n => idSet.has(n.id) ? { ...n, ...updates } : n);
    
    if (isStyleUpdate) {
      const lockRec = (nodeId: string) => {
        newNodes = newNodes.map(n => n.id === nodeId ? { ...n, styleLocked: true } : n);
        edges.forEach(e => { if (e.from === nodeId) lockRec(e.to); });
      };
      selectedNodeIds.forEach(id => lockRec(id));
    }

    setGraph(newNodes, edges);
    if (updates.nodeLength) {
      setTimeout(() => handleLayout(true), 50);
    }
    debouncedPushHistory();
    debouncedPersistData();
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
        e.preventDefault(); 

        if (!editingNodeId && selectedNodeIds.length === 1) {
          handleAddChild(selectedNodeIds[0]);
        }
        return; 
      }
      if (editingNodeId) return;
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      )
        return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return; 
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return; 
      }

      if (selectedNodeIds.length !== 1) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteNode(); 
        }
        return;
      }
      
      const singleSelectedId = selectedNodeIds[0]; 

      if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild(singleSelectedId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSibling(singleSelectedId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteNode(); 
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
      editingNodeId, selectedNodeIds, handleAddChild, 
      handleAddSibling, handleDeleteNode, undo, redo, startEditing,
    ]
  );

  const handleToolbarAddChild = useCallback(() => {
    if (selectedNodeIds.length === 1) { 
      handleAddChild(selectedNodeIds[0]);
    }
  }, [selectedNodeIds, handleAddChild]); 

  const handleToolbarAddSibling = useCallback(() => {
    if (selectedNodeIds.length === 1) { 
      handleAddSibling(selectedNodeIds[0]);
    }
  }, [selectedNodeIds, handleAddSibling]);

  const handleSetHyperlink = useCallback(() => {
  if (selectedNodeIds.length !== 1) return;
  const nodeId = selectedNodeIds[0];
  const node = nodeMap.get(nodeId);
  if (!node) return;
  const currentUrl = (node as any).hyperlink || "";
  const url = window.prompt("Nhập URL cho liên kết (để trống để xóa):", currentUrl);
   
  if (url !== null) { 
    handleUpdateNode({ hyperlink: url || undefined });
  }
  }, [selectedNodeIds, nodeMap, handleUpdateNode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleDragStart = (nodeId: string) => {
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges); // GĐ 7
    setDragStartState({ nodes, edges });
    const node = stageRef.current?.findOne(`#${nodeId}`);
    if (node && editingNodeId === nodeId) {
      node.stopDrag();
    }
  };

  // ...
  const handleImageLoad = useCallback((nodeId: string, width: number, height: number) => {
    const { nodes, edges } = useEditorStore.getState();
    const node = nodes.find(n => n.id === nodeId);
    
    // Chỉ update nếu chưa có kích thước hoặc kích thước thay đổi
    if (node && (node.imageWidth !== width || node.imageHeight !== height)) {
        const newNodes = nodes.map(n => 
            n.id === nodeId ? { ...n, imageWidth: width, imageHeight: height } : n
        );
        setGraph(newNodes, edges);
        debouncedPersistData();
       
        pendingLayoutRef.current = true;
    }
  }, [setGraph, debouncedPersistData]); 

  useEffect(() => {
    if (pendingLayoutRef.current) {
      handleLayout(true); 
      pendingLayoutRef.current = false;
    }
  }, [handleLayout]);

  useEffect(() => {
    if (isDataLoaded) {
      const t = setTimeout(() => {
        handleFitToScreen();
        setIsReadyToShow(true); 
      }, 10); 
      return () => clearTimeout(t);
    }
  }, [isDataLoaded, handleFitToScreen]);

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
      sendPatch('NODE_REPARENT', {
        nodeId: draggedNodeId, newParentId, x: finalX, y: finalY, side: parentSide,
      });
    } else {
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
      sendPatch('NODE_MOVE', { id: draggedNodeId, x: finalX, y: finalY });
    }
    setDropTargetId(null);
    setTimeout(() => handleLayout(true), 50); 
    debouncedPersistData();
  };

  const handleToggleColoredBranch = (state: boolean) => {
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges); 
    if (state) {
      const rootChildren = edges.filter(e => e.from === 'root').map(e => e.to);
      let newNodes = [...nodes];
      rootChildren.forEach((childId, idx) => {
        const color = BRANCH_COLORS_PALETTE[idx % BRANCH_COLORS_PALETTE.length];
        const assignRec = (nodeId: string) => {
          newNodes = newNodes.map(n => n.id === nodeId ? (n.styleLocked ? n : { ...n, branchColor: color }) : n);
          edges.forEach(e => { if (e.from === nodeId) assignRec(e.to); });
        };
        assignRec(childId);
      });
      setGraph(newNodes, edges);
    } else {
      const newNodes = nodes.map(n => {
        if (n.styleLocked) return n;
        return { 
          ...n, 
          branchColor: undefined, 
          color: undefined, 
          textColor: undefined, 
          borderColor: undefined 
        };
      });
      setGraph(newNodes, edges);
    }
    debouncedPersistData();
    sendPatch('LINE_COLOR_TOGGLE', { state });
  };

  const handleSetBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
    debouncedPersistData();
    sendPatch('BACKGROUND_CHANGE', { color });
  };
   
  const handleSetGlobalBranchColor = (color: string) => {
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
    setGlobalStore({ globalBranchColor: color });

    const newNodes = nodes.map(n => {
      if (n.styleLocked) return n; 
      return { 
        ...n, 
        branchColor: undefined,
        color: undefined,        
        borderColor: undefined, 
        textColor: undefined    
      };
    });
    
    setGraph(newNodes, edges);
    // Lưu lại
    useEditorStore.setState({ isDirty: true });
    // Gửi patch
    debouncedPersistData();
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
    const tempResetStyle = applyNodeDefaults(nodes[0], activeTheme);
    selectedNodeIds.forEach(id => {
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
    sendPatch('NODE_STYLE_PASTE', { id: selectedNodeIds, style: styleClipboard }); 
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
    sendPatch('NODE_STYLE_RESET', { id: selectedNodeIds, resetStyle }); 
  };

  const handleToggleCollapse = useCallback(
    (e: any, nodeId: string, side?: 'left' | 'right') => {
      e.cancelBubble = true;
      
      if (nodeId === 'root' && side) {
        setRootCollapse(prev => ({ ...prev, [side]: !prev[side] }));
        sendPatch('ROOT_TOGGLE_COLLAPSE', { side });
      } else if (nodeId !== 'root') {
        const newNodes = nodes.map(n => 
          n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
        );
        setGraph(newNodes, edges);
        debouncedPushHistory();
        debouncedPersistData();
        sendPatch('NODE_TOGGLE_COLLAPSE', { id: nodeId }); 
      }
    },
    [
      nodes, edges, setGraph, debouncedPushHistory, 
      debouncedPersistData, sendPatch, 
    ]
  );

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
      const target = Math.max(visual.box.h, unscaledScroll)*0.8;
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
      textAlign: style.textAlign || 'CENTER',
      textColor: style.textColor || '#333333',
      textDecoration: style.textDecoration || 'none',
    };
  }, [editingNodeId, nodeVisuals, nodeMap, scale, pos]);

  // ================================================
  // Render 
  // ================================================

  if (!isReadyToShow) { 
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
              `..import url('https://fonts.googleapis.com/css2?family=${
                font.value.split(',')[0].replace(/ /g, '+')
              }:wght..400;700&display=swap');`
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
          onUpdateNode={handleUpdateNode}
          onToggleBoundary={handleToggleBoundary}
        />
        <Sidebar />

        {editingNodeId &&
          (() => {
            const visual = nodeVisuals.get(editingNodeId!);
            const node = nodeMap.get(editingNodeId!);
            if (!visual || !node || !stageRef.current) return null;

            const { style, box } = visual;
            const stageRect = stageRef.current.container().getBoundingClientRect();
            const absoluteX = stageRect.left + pos.x + style.x * scale;
            const absoluteY = stageRect.top + pos.y + style.y * scale;

            return (
              <textarea
                ref={editingInputRef}
                defaultValue={node.nodeText}
                onInput={(e) => {
                  const el = e.currentTarget as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  const newHeight = Math.max(visual.box.h, el.scrollHeight);
                  el.style.height = `${newHeight}px`;
                }}
                onBlur={() => stopEditing(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    stopEditing(true);
                  } else if (e.key === 'Escape') {
                    stopEditing(false);
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    stopEditing(true);
                  }
                }}
                style={{
                  position: 'fixed',
                  left: absoluteX,
                  top: absoluteY,
                  width: visual.box.w,
                  height: visual.box.h,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transformOrigin: 'center center',
                  
                  fontSize: `${visual.box.finalFontSize}px`,
                  fontWeight: visual.style.fontWeight || 'normal',
                  fontStyle: visual.style.fontStyle === 'italic' ? 'italic' : 'normal',
                  fontFamily: visual.style.fontFamily || 'Inter',
                  lineHeight: 1.3, 
                  padding: `${PADDING_Y}px ${PADDING_X}px`,
                  textAlign: (visual.style.textAlign || 'CENTER').toLowerCase() as 'left' | 'center' | 'right',
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
                  outline: '2px solid #3b82f6', 
                  zIndex: 100,
                  overflow: 'hidden',
                  resize: 'none',
                }}
                className="shadow-lg" 
              />
            );
          })()}

        <div
          className="w-full h-full pt-12 relative" 
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
              const stage = e.target.getStage();
              if (!stage) return;

              if (e.evt.ctrlKey) {
                // === LOGIC ZOOM ===
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
                // === LOGIC PAN ===
                setPos({
                  x: pos.x - e.evt.deltaX, 
                  y: pos.y - e.evt.deltaY,
                });
              }
            }}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              if (!stage) return;

              const isPanIntent = (e.evt.ctrlKey && e.evt.button === 0) || e.evt.button === 1;
              if (e.target === stage) {
                if (isPanIntent) {
                  setIsPanning(true);
                  isSelecting.current = false;
                } else if (e.evt.button === 0) {
                  setIsPanning(false);
                  isSelecting.current = true;
                  const pos = stage.getPointerPosition();
                  if (!pos) return;
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
                isSelecting.current = false;
                setSelectionRect({ ...selectionRect, visible: false });
                const { x, y, width, height } = selectionRect;
                const rect = {
                  x1: x,
                  y1: y,
                  x2: x + width,
                  y2: y + height,
                };

                const newlySelectedIds = visibleNodes
                  .filter((node) => {
                    return (
                      node.x > rect.x1 &&
                      node.x < rect.x2 &&
                      node.y > rect.y1 &&
                      node.y < rect.y2
                    );
                  })
                  .map((node) => node.id);

                if (e.evt.shiftKey) {
                  setSelectedNodeIds(prevIds => [...new Set([...prevIds, ...newlySelectedIds])]);
                } else {
                  setSelectedNodeIds(newlySelectedIds);
                }
              }
            }}
            onMouseMove={(e) => {
              if (isPanning) {
                setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY });
              } else if (isSelecting.current) {
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
              if (e.target !== stage) return;
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
              {visibleNodes.map((node) =>
                node.boundary ? (
                  <Boundary
                    key={`boundary-${node.id}`}
                    nodeId={node.id}
                    nodes={nodes}
                    edges={edges}
                    nodeVisuals={nodeVisuals}
                  />
                ) : null
              )}
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
                strokeColor = globalBranchColor;
                const strokeWidth = branchLineWidth || 2;
                const isBezier = fromStyle.branchLineStyle === 'bezier' && globalStructure !== 'org'; // Changed to fromStyle
                const lineProps = {
                  points: points,
                  stroke: strokeColor,
                  strokeWidth: strokeWidth,
                  bezier: isBezier,
                  lineCap: 'round' as const,
                  lineJoin: 'round' as const,
                };
                if (fromStyle.branchLineEnd === 'arrow') { // Changed to fromStyle
                  return <Arrow {...lineProps} key={edge.id} pointerLength={8} pointerWidth={6} fill={strokeColor} />;
                }
                return <Line {...lineProps} key={edge.id} />;
              })}

              {visibleNodes.map((node) => {
                const visual = nodeVisuals.get(node.id);
                if (!visual) return null;
                const { style, box } = visual;
                const { w, h, textToRender, finalFontSize, imageHeight, imageWidthDisplay } = box;
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
                    
                    {/* [MỚI] Hiển thị ảnh trong Node */}
                    {style.imageUrl && (
                      <URLImage 
                        src={style.imageUrl}
                        x={-w/2 + (style.borderWidth || 0) + PADDING_X} 
                        y={-h/2 + (style.borderWidth || 0) + PADDING_Y} 
                        width={imageWidthDisplay}
                        height={imageHeight}
                        onImageLoad={(imgW: number, imgH: number) => handleImageLoad(node.id, imgW, imgH)}
                      />
                    )}

                    <Text
                      visible={editingNodeId !== node.id}
                      text={textToRender || '(...)'}
                      width={w} 
                      height={style.imageUrl ? (h - imageHeight - 10) : h} 
                      offsetX={w / 2} 
                      offsetY={style.imageUrl ? (h / 2) - imageHeight - 10 : h / 2} 
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
                      x={w / 2 - 20} 
                      y={0} 
                      onClick={(e) => {
                        e.cancelBubble = true; 
                        window.open((style as any).hyperlink, '_blank', 'noopener,noreferrer');
                      }}
                      onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }}
                      onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}
                      title={`Mở link: ${(style as any).hyperlink}`}
                    >
                      <Circle radius={8} fill="#5f85ffff" stroke="#ffffffff" strokeWidth={1} />
                      <Path 
                        data="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6 M21 3l-9 9 M15 3h6v6"
                        stroke="#ffffffff"      
                        strokeWidth={2}       
                        lineCap="round"
                        lineJoin="round"
                        scale={{ x: 0.4, y: 0.4 }} 
                        offsetX={12}          
                        offsetY={12}          
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
              
              onToggleColoredBranch={() => {}}
            />
          )}
        </div>
      </div>
    </>
  );
}