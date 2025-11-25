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
import { v4 as uuidv4 } from 'uuid';

// --- Components ---
import EditorToolbar from '../features/editor/EditorToolbar';
import Sidebar from '../components/layout/Sidebar';
import FormattingToolbar from '../features/editor/FormattingToolbar';
import Spinner from '../components/common/Spinner';

// --- Stores & Types ---
import {
  useEditorStore,
  NodeData,
  EdgeData,
  GlobalStructure,
  QuickStyleId,
  colorThemes,
  fonts,
  getNodeComputedStyle,
  applyNodeDefaults,
  DEFAULT_NODE_STYLE,
  NodeTopology
} from '../app/store/useEditorStore';
import { useMindmapsStore } from '../app/store/useMindmapsStore';

// --- Services & Hooks ---
import { mindmapsApi, FeMindmapDoc } from '../services/mindmapsApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import { useLocalMindmap } from '../hooks/useLocalMindmap';
import { 
  BeMindmapDoc,
  normalizeContentBEtoFE,
} from '../services/dataMapper';

// --- NEW IMPORTS: Realtime & Helpers ---
import { useRealtime } from '../hooks/useRealtime';
import { 
  PADDING_X, 
  PADDING_Y, 
  LINE_HEIGHT_MULTIPLIER,
  BRANCH_COLORS_PALETTE,
  loadGuestDoc,
  saveGuestDoc,
  calculateNodeBox,
  mixWithWhite,
  getContrastColor
} from '../features/editor/utils/EditorHelpers';

import CursorLayer from '../features/editor/CursorLayer'; // [MỚI]


export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { toggleTheme } = useTheme();
  const { isAuthed, login, user} = useAuth();
  const { createGuest } = useLocalMindmap();
  const isGuest = !!id && id.startsWith('guest-');
  

  // --- State từ Store ---
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

  const setMindmapsStore = useMindmapsStore(s => s.set);
  const mindmapItems = useMindmapsStore(s => s.items);

  // --- State nội bộ (UI State) ---
  const [name, setName] = useState('Loading...');
  const [ownerId, setOwnerId] = useState<string | null>(null); // [MỚI] Lưu ownerId
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFormattingToolbarOpen, setFormattingToolbarOpen] = useState(false);
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
  const [styleClipboard, setStyleClipboard] = useState<Partial<NodeData> | null>(null);
  const [rootCollapse, setRootCollapse] = useState({ left: false, right: false });
  
  // --- Refs ---
  const lastEditStopTime = useRef(0);
  const stageRef = useRef<any>(null);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);
  const selectionStartPos = useRef({ x: 0, y: 0 });
  const isSelecting = useRef(false);
  const [selectionRect, setSelectionRect] = useState({
    x: 0, y: 0, width: 0, height: 0, visible: false,
  });
    const isOwner = useMemo(() => {
      if (!user || !ownerId) return false;
      return user.sub === ownerId || user.id === ownerId; 
  }, [user, ownerId]);

  const activeTheme = colorThemes[activeColorThemeId as keyof typeof colorThemes];

  // =========================================================================
  // 1. LOGIC TÍNH TOÁN TOPOLOGY & VISUALS
  // =========================================================================
  
  const nodeTopology = useMemo(() => {
    const topology = new Map<string, NodeTopology>();
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    });

    const traverse = (nodeId: string, depth: number, rootBranchIndex: number) => {
      topology.set(nodeId, { depth, branchIndex: rootBranchIndex });
      const children = adj.get(nodeId) || [];
      children.forEach((childId, index) => {
        const nextBranchIndex = (nodeId === 'root') ? index : rootBranchIndex;
        traverse(childId, depth + 1, nextBranchIndex);
      });
    };
    traverse('root', 0, 0);
    return topology;
  }, [nodes, edges]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  
  const nodesWithChildren = useMemo(
    () => new Set(edges.map((e) => e.from)),
    [edges]
  );

  const selectedIdsSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const firstSelectedId = useMemo(() => selectedNodeIds[0], [selectedNodeIds]);
  const currentNode = useMemo(() => {
    if (!firstSelectedId) return null;
    return nodeMap.get(firstSelectedId) || null;
  }, [firstSelectedId, nodeMap]);

  // Tính toán Style
  const computedNodeStyles = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((node) => {
      const topo = nodeTopology.get(node.id);
      map.set(
        node.id, 
        getNodeComputedStyle(node, activeTheme, globalFont, topo)
      );
    });
    return map;
  }, [nodes, activeTheme, globalFont, nodeTopology]);

  // Tính toán kích thước (Box)
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

  // =========================================================================
  // 2. LOGIC ẨN/HIỆN NODE (VISIBILITY) - [FIXED SECTION]
  // =========================================================================

  const isNodeVisible = useCallback((nodeId: string): boolean => {
    const node = nodeMap.get(nodeId);
    if (!node) return false;
    if (nodeId === 'root' || !node.parentId) return true;
    
    // Logic đặc biệt cho Root con (trái/phải)
    if (node.parentId === 'root') {
      if (node.side === 'left' && rootCollapse.left) return false;
      if ((node.side === 'right' || !node.side) && rootCollapse.right) return false;
    }
    
    const parent = nodeMap.get(node.parentId);
    if (!parent) return true;
    if (parent.collapsed) return false; // Nếu cha bị đóng -> con ẩn
    if (parent.id === 'root') return true; // Nếu cha là root (và root ko đóng side) -> hiện
    
    // Đệ quy kiểm tra tổ tiên
    return isNodeVisible(node.parentId);
  }, [nodeMap, rootCollapse]);

  // Danh sách node hiển thị
  const visibleNodes = useMemo(
    () => nodes.filter((n) => isNodeVisible(n.id)),
    [nodes, isNodeVisible]
  );

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );

  // Danh sách cạnh hiển thị
  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
      ),
    [edges, visibleNodeIds]
  );

  // Đếm số lượng con cháu (để hiển thị badge)
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


  // =========================================================================
  // 3. AUTO-SAVE LOGIC (SERVER AUTHORITY)
  // =========================================================================
  
  const debouncedPushHistory = useDebouncedCallback(() => {
    const { nodes, edges } = useEditorStore.getState();
    pushHistory(nodes, edges);
  }, 500);

  const debouncedPersistData = useDebouncedCallback(() => {
    if (!isDataLoaded || !id) return;
    const { nodes: currentNodes, edges: currentEdges } = useEditorStore.getState();

    if (isGuest) {
      saveGuestDoc(id, name, currentNodes, currentEdges); 
    } else if (isAuthed) {
      // [TASK 2.1] Chỉ Owner mới được quyền Auto-save đè lên DB (REST API)
      if (isOwner) {
        const docToSave = {
          name,
          content: { nodes: currentNodes, edges: currentEdges },
        };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu trữ (persist) ngầm thất bại:', e);
        });
      } else {
          console.log("🚫 Not owner, skipping REST auto-save (Real-time patches sent instead)");
      }
    }
  }, 5000);

  // =========================================================================
  // 4. LAYOUT ALGORITHM
  // =========================================================================
  
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
        const treeMap = new Map<string, any>();
        
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
        
        const calculateSubtreeHeights = (node: any): number => {
          const visual = nodeVisuals.get(node.id);
          const selfHeight = visual?.box.h || 60;
          if (node.children.length === 0) {
            node.subtreeHeight = selfHeight;
            return selfHeight;
          }
          let childrenTotalHeight = 0;
          node.children.forEach((child: any, index: number) => {
            childrenTotalHeight += calculateSubtreeHeights(child);
            if (index > 0) childrenTotalHeight += VERTICAL_GAP;
          });
          node.subtreeHeight = Math.max(selfHeight, childrenTotalHeight);
          return node.subtreeHeight;
        };

        const positionBranch = (branchNodes: any[], parent: any, side: 'left' | 'right') => {
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
            
            node.x = parent.x + direction * (HORIZONTAL_GAP + parentWidth / 2 + nodeWidth / 2);
            node.y = currentY + blockHeight / 2;
            node.side = side;
            currentY += blockHeight + VERTICAL_GAP;
            
            if (node.children.length > 0) {
              positionChildrenVertically(node.children, node, side);
            }
          });
        };

        const positionChildrenVertically = (children: any[], parent: any, side: 'left' | 'right') => {
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
            
            node.x = parent.x + direction * (HORIZONTAL_GAP / 1.5 + parentWidth / 2 + nodeWidth / 2);
            node.y = currentY + blockHeight / 2;
            node.side = side;
            currentY += blockHeight + VERTICAL_GAP;
            
            if (node.children.length > 0) {
              positionChildrenVertically(node.children, node, side);
            }
          });
        };

        if (rootNode) {
          calculateSubtreeHeights(rootNode);
          rootNode.x = ROOT_X;
          rootNode.y = ROOT_Y;
          rootNode.side = 'right';
          const rightGroup: any[] = [];
          const leftGroup: any[] = [];
          let rightHeight = 0;
          let leftHeight = 0;
          const sortedRootChildren = [...rootNode.children].sort((a, b) => b.subtreeHeight - a.subtreeHeight);
          
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
          newNodes = Array.from(treeMap.values()).map((node: any) => {
            const { children, subtreeHeight, ...rest } = node;
            return rest;
          });
        }
      } else {
        // Dagre layout
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
          const side = layoutType === 'org' ? 'right' : pos.x < 0 ? 'left' : 'right';
          return pos ? { ...n, x: pos.x, y: pos.y, side: side as any } : n;
        });
      }

      // Post-processing for Floating Nodes
      const finalNodesMap = new Map(newNodes.map(n => [n.id, n]));
      const allEdges = useEditorStore.getState().edges;
      const floatingRoots = newNodes.filter(n => (n.parentId === undefined || n.parentId === null) && n.id !== 'root');
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
          g.setNode(node.id, { label: node.nodeText, width: visual?.box.w || 100, height: visual?.box.h || 50 });
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
      setGraph(newNodes, edges);
      setRootCollapse({ left: false, right: false });

      // Auto-center
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
          setPos({ x: currentWidth / 2 - newNodes[0].x, y: currentHeight / 2 - newNodes[0].y });
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

  // =========================================================================
  // 5. REALTIME HOOK INTEGRATION
  // =========================================================================
  // [FIX] Tạo callback ổn định để không gây re-connect WebSocket
  const handleSetRootCollapse = useCallback((side: 'left' | 'right', collapsed: boolean) => {
      setRootCollapse(prev => ({ ...prev, [side]: !prev[side] })); 
  }, []);

  // [BƯỚC 2] Truyền hàm đã define ở trên vào hook
  const { sendPatch, sendCursor, isConnected } = useRealtime({
    mindmapId: id,
    isGuest,
    isDataLoaded,
    isOwner, 
    onLayoutRequest: handleLayout,
    onSetRootCollapse: handleSetRootCollapse, // <--- Dùng hàm này, KHÔNG viết trực tiếp (side) => {...} ở đây
  });
  const myColor = useMemo(() => BRANCH_COLORS_PALETTE[Math.floor(Math.random() * BRANCH_COLORS_PALETTE.length)], []);
  const myName = useMemo(() => "Me", []);

  // =========================================================================
  // 6. ZOOM & PAN HANDLERS
  // =========================================================================
  
  const zoomStep = 1.2;
  const handleSetZoom = useCallback((newScale: number) => {
    const stage = stageRef.current;
    if (!stage) { setScale(newScale); return; }
    const { width, height } = dimensions;
    const oldScale = scale;
    const center = { x: width / 2, y: height / 2 };
    const mousePointTo = {
      x: (center.x - pos.x) / oldScale,
      y: (center.y - pos.y) / oldScale,
    };
    setScale(newScale);
    setPos({
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
  }, [scale, pos.x, pos.y, dimensions.width, dimensions.height]);

  const handleZoomIn = useCallback(() => handleSetZoom(scale * zoomStep), [scale, handleSetZoom]);
  const handleZoomOut = useCallback(() => handleSetZoom(scale / zoomStep), [scale, handleSetZoom]);
  const handleFitToScreen = useCallback(() => handleLayout(false), [handleLayout]);

  const handleResize = useCallback(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight - 48 });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // =========================================================================
  // 7. DATA LOADING
  // =========================================================================
  
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsDataLoaded(false);
      if (!id) {
        if (isAuthed) { navigate('/dashboard', { replace: true }); return; }
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
            if (!isAuthed) addToast('Vui lòng đăng nhập để xem mindmap này.', 'info');
            data = await mindmapsApi.get(id);
          }
        }

        if (isMounted) {
          setName(data.name);
          setOwnerId(data.ownerId); // [MỚI] Lưu ownerId từ data để tính isOwner
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
    return () => { isMounted = false; };
  }, [id, isAuthed, navigate, addToast, clearHistory, setGraph, pushHistory, activeColorThemeId, setGlobalStore, isGuest, createGuest]);

  const handleSave = () => {
    if (!isAuthed) {
      addToast('Vui lòng đăng nhập để lưu mindmap.', 'info');
      login();
    } else if (id) {
      const content = { nodes: nodes, edges };
      mindmapsApi.update(id, { name, content })
        .then(() => {
          addToast('Đã lưu mindmap!', 'success');
          useEditorStore.setState({ isDirty: false });
          const newItems = mindmapItems.map(item => item.id === id ? { ...item, name: name } : item);
          setMindmapsStore({ items: newItems });
        })
        .catch((e) => {
          console.error('Save failed:', e);
          addToast('Lưu thất bại', 'error');
        });
    }
  };

  useEffect(() => {
    if (selectedNodeIds.length > 0) setFormattingToolbarOpen(true);
  }, [selectedNodeIds]);

  // =========================================================================
  // 8. INTERACTION HANDLERS
  // =========================================================================
  
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
    setTimeout(() => handleLayout(true), 0);
  }, [nodes, isDataLoaded, handleLayout]);

  const stopEditing = useCallback((save: boolean) => {
    lastEditStopTime.current = Date.now();
    if (!editingNodeId) return;
    const node = nodes.find((n) => n.id === editingNodeId);
    if (!node) return;
    const newText = editingInputRef.current?.value ?? node.nodeText;
    setEditingNodeId(null);

    if (save && newText !== node.nodeText) {
      const newNodes = nodes.map((n) => n.id === editingNodeId ? { ...n, nodeText: newText } : n);
      setGraph(newNodes, edges);
      justStoppedEditingRef.current = true; 
      useEditorStore.setState({ isDirty: true });
      debouncedPushHistory();
      debouncedPersistData();
      sendPatch('NODE_TEXT_CHANGE', { id: editingNodeId, text: newText }); 
    }
  }, [editingNodeId, nodes, edges, setGraph, debouncedPushHistory, debouncedPersistData, sendPatch]);

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodeMap.get(parentId);
    const parentVisual = nodeVisuals.get(parentId);
    if (!parentNode || !parentVisual) return;
    const parentComputedStyle = parentVisual.style;
    
    const newId = uuidv4();

    const newNodeData: NodeData = { 
      id: newId, 
      nodeText: "Nội dung",
      x: parentComputedStyle.x + 40,
      y: parentComputedStyle.y + 20,
      parentId,
      side: parentComputedStyle.side, 
    };

    const styleKeys = Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>;
    styleKeys.forEach(key => {
      if (parentNode[key] !== undefined) {
        (newNodeData as any)[key] = parentNode[key];
      }
    });

    if (parentId === 'root') {
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
    sendPatch('NODE_CREATE', { node: newNodeData, edge: newEdgeData });
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout, sendPatch]);

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

    const newId = uuidv4();

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
    sendPatch('NODE_CREATE', { node: newNodeData, edge: newEdgeData });
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout, handleAddChild, sendPatch]);

  const handleDeleteNode = useCallback(() => {
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
    const newEdges = edges.filter((e) => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to));
    setGraph(newNodes, newEdges);
    setSelectedNodeIds([parentId]);
    setTimeout(() => handleLayout(true), 50);
    debouncedPushHistory();
    debouncedPersistData();
    sendPatch('NODE_DELETE', { nodeIds: Array.from(nodesToDelete) });
  }, [nodes, edges, setGraph, selectedNodeIds, handleLayout, debouncedPushHistory, debouncedPersistData, sendPatch]);

  const handleUpdateNode = (updates: Partial<NodeData>) => {
    if (selectedNodeIds.length === 0) return;
    let newNodes = [...nodes];
    const idSet = selectedIdsSet;
    const STYLE_KEYS: Array<keyof NodeData> = ['shape', 'color', 'borderColor', 'borderWidth', 'borderStyle', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'textColor', 'textCase', 'nodeLength', 'branchColor', 'branchLineStyle', 'branchLineEnd', 'branchLineThickness'];
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
    if (updates.nodeLength) setTimeout(() => handleLayout(true), 50);
    debouncedPushHistory();
    debouncedPersistData();
    selectedNodeIds.forEach(id => {
      sendPatch('NODE_STYLE_UPDATE', { id, updates });
    });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (Date.now() - lastEditStopTime.current < 100) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!editingNodeId && selectedNodeIds.length === 1) handleAddChild(selectedNodeIds[0]);
      return;
    }
    if (editingNodeId) return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault(); redo(); return;
    }

    if (selectedNodeIds.length !== 1) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); handleDeleteNode();
      }
      return;
    }
    
    const singleSelectedId = selectedNodeIds[0];
    if (e.key === 'Tab') { e.preventDefault(); handleAddChild(singleSelectedId); } 
    else if (e.key === 'Enter') { e.preventDefault(); handleAddSibling(singleSelectedId); } 
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteNode(); } 
    else if (e.key === 'F2') { e.preventDefault(); startEditing(singleSelectedId); } 
    else if (e.key.length === 1 && /^[a-zA-Z0-9\S]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startEditing(singleSelectedId);
      setTimeout(() => { if (editingInputRef.current) editingInputRef.current.value = e.key; }, 50);
    }
  }, [editingNodeId, selectedNodeIds, handleAddChild, handleAddSibling, handleDeleteNode, undo, redo, startEditing]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // =========================================================================
  // 9. TOOLBAR HANDLERS
  // =========================================================================
  
  const handleToolbarAddChild = useCallback(() => {
    if (selectedNodeIds.length === 1) handleAddChild(selectedNodeIds[0]);
  }, [selectedNodeIds, handleAddChild]);

  const handleToolbarAddSibling = useCallback(() => {
    if (selectedNodeIds.length === 1) handleAddSibling(selectedNodeIds[0]);
  }, [selectedNodeIds, handleAddSibling]);

  const handleSetHyperlink = useCallback(() => {
    if (selectedNodeIds.length !== 1) return;
    const nodeId = selectedNodeIds[0];
    const node = nodeMap.get(nodeId);
    if (!node) return;
    const currentUrl = (node as any).hyperlink || "";
    const url = window.prompt("Nhập URL cho liên kết (để trống để xóa):", currentUrl);
    if (url !== null) handleUpdateNode({ hyperlink: url || undefined });
  }, [selectedNodeIds, nodeMap, handleUpdateNode]);

  const handleToggleColoredBranch = (state: boolean) => {
    pushHistory(nodes, edges);
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
    debouncedPersistData();
    sendPatch('LINE_COLOR_TOGGLE', { state });
  };

  const handleSetBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    const newNodes = nodes.map(n => {
      if (n.styleLocked) return n;
      const fill = mixWithWhite(color, 0.85);
      const branchFill = color;
      return { ...n, color: n.color || fill, branchColor: n.branchColor || branchFill, textColor: getContrastColor(fill) };
    });
    pushHistory(nodes, edges);
    setGraph(newNodes, edges);
    debouncedPersistData();
    sendPatch('BACKGROUND_CHANGE', { color });
  };

  const handleSetGlobalBranchColor = (color: string) => {
    pushHistory(nodes, edges);
    setGlobalStore({ globalBranchColor: color });
    const { isColoredBranch } = useEditorStore.getState();
    if (!isColoredBranch) {
      const newNodes = nodes.map(n => {
        if (n.styleLocked) return n;
        const fill = mixWithWhite(color, 0.85);
        return { ...n, branchColor: undefined, color: fill, textColor: getContrastColor(fill) };
      });
      setGraph(newNodes, edges);
    }
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
    const tempResetStyle = applyNodeDefaults(nodes[0], activeTheme);
    selectedNodeIds.forEach(id => {
      sendPatch('NODE_QUICK_STYLE_APPLY', { id: id, styleId, resetStyle: tempResetStyle });
    });
  };

  const handleCopyStyle = () => {
    if (!currentNode) return;
    const styleToCopy: Partial<NodeData> = {};
    (Object.keys(DEFAULT_NODE_STYLE) as Array<keyof typeof DEFAULT_NODE_STYLE>).forEach(key => {
      if (currentNode[key] !== undefined) (styleToCopy as any)[key] = currentNode[key];
    });
    setStyleClipboard(styleToCopy);
    addToast('Đã sao chép kiểu!', 'success');
  };

  const handlePasteStyle = () => {
    if (!selectedNodeIds || !styleClipboard) return;
    const idSet = selectedIdsSet;
    const newNodes = nodes.map((n) => idSet.has(n.id) ? { ...n, ...styleClipboard } : n);
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
    const newNodes = nodes.map((n) => idSet.has(n.id) ? { ...n, ...resetStyle } : n);
    setGraph(newNodes, edges);
    setTimeout(() => handleLayout(true), 50);
    debouncedPushHistory();
    debouncedPersistData();
    sendPatch('NODE_STYLE_RESET', { id: selectedNodeIds, resetStyle });
  };

  const handleToggleCollapse = useCallback((e: any, nodeId: string, side?: 'left' | 'right') => {
    e.cancelBubble = true;
    if (nodeId === 'root' && side) {
      setRootCollapse(prev => ({ ...prev, [side]: !prev[side] }));
      sendPatch('ROOT_TOGGLE_COLLAPSE', { side });
    } else if (nodeId !== 'root') {
      const newNodes = nodes.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n);
      setGraph(newNodes, edges);
      debouncedPushHistory();
      debouncedPersistData();
      sendPatch('NODE_TOGGLE_COLLAPSE', { id: nodeId });
    }
  }, [nodes, edges, setGraph, debouncedPushHistory, debouncedPersistData, sendPatch]);

  // =========================================================================
  // 10. DRAG & DROP HANDLERS
  // =========================================================================
  
  const handleDragStart = (nodeId: string) => {
    pushHistory(nodes, edges);
    setDragStartState({ nodes, edges });
    const node = stageRef.current?.findOne(`#${nodeId}`);
    if (node && editingNodeId === nodeId) node.stopDrag();
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
      if (pos.x > x - w / 2 && pos.x < x + w / 2 && pos.y > y - h / 2 && pos.y < y + h / 2) {
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
        if (id === dropTargetId) { isDroppingOnChild = true; return; }
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
        newEdges = edges.map((e) => e.id === oldEdge.id ? { ...e, from: newParentId } : e);
      } else {
        newEdges = [...edges, { id: `e-${draggedNodeId}`, from: newParentId, to: draggedNodeId }];
      }
      const parentSide = nodeMap.get(newParentId)?.side || 'right';
      const newNodes = nodes.map((n) => n.id === draggedNodeId ? { ...n, parentId: newParentId, x: finalX, y: finalY, side: parentSide } : n);
      setGraph(newNodes, newEdges);
      sendPatch('NODE_REPARENT', { nodeId: draggedNodeId, newParentId, x: finalX, y: finalY, side: parentSide });
    } else {
      const newNodes = nodes.map((n) => {
        if (n.id === draggedNodeId) {
          if (n.parentId) return { ...n, x: finalX, y: finalY };
          return { ...n, x: finalX, y: finalY, parentId: undefined, side: undefined };
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

  // =========================================================================
  // 11. RENDER
  // =========================================================================

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
        {fonts.map((font) => `@import url('https://fonts.googleapis.com/css2?family=${font.value.split(',')[0].replace(/ /g, '+')}:wght@400;700&display=swap');`).join('\n')}
      </style>
      <div className="w-screen h-screen bg-white overflow-hidden flex flex-col">
        <EditorToolbar
          onCommitName={() => { debouncedPersistData(); sendPatch('MAP_NAME_CHANGE', { name }); }}
          onDashboard={() => navigate('/dashboard')}
          onUndo={undo} onRedo={redo}
          onShare={() => { navigator.clipboard.writeText(window.location.href); addToast('Đã sao chép link chia sẻ!', 'success'); }}
          onTheme={toggleTheme}
          onSave={handleSave}
          isDirty={isDirty}
          onToggleFormattingToolbar={() => setFormattingToolbarOpen(!isFormattingToolbarOpen)}
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

        {editingNodeId && (() => {
          const visual = nodeVisuals.get(editingNodeId!);
          const node = nodeMap.get(editingNodeId!);
          if (!visual || !node || !stageRef.current) return null;
          const stageRect = stageRef.current.container().getBoundingClientRect();
          const localLeft = visual.style.x - visual.box.w / 2;
          const localTop = visual.style.y - visual.box.h / 2;
          return (
            <div style={{ position: 'absolute', left: stageRect.left, top: stageRect.top, width: stageRect.width, height: stageRect.height, transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transformOrigin: '0 0', zIndex: 50, pointerEvents: 'none' }}>
              <textarea
                ref={editingInputRef}
                defaultValue={node.nodeText}
                onInput={(e) => {
                  const el = e.currentTarget as HTMLTextAreaElement;
                  if (!visual) return;
                  el.style.height = 'auto';
                  const unscaledScroll = el.scrollHeight / Math.max(scale, 0.0001);
                  el.style.height = `${Math.max(visual.box.h, unscaledScroll)}px`;
                }}
                onBlur={() => stopEditing(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stopEditing(true); }
                  else if (e.key === 'Escape') { stopEditing(false); }
                  else if (e.key === 'Tab') { e.preventDefault(); stopEditing(true); }
                }}
                style={{ position: 'absolute', left: localLeft, top: localTop, width: visual.box.w, height: visual.box.h, fontSize: `${visual.box.finalFontSize}px`, fontWeight: visual.style.fontWeight || 'normal', fontStyle: visual.style.fontStyle === 'italic' ? 'italic' : 'normal', fontFamily: visual.style.fontFamily || 'Inter', lineHeight: LINE_HEIGHT_MULTIPLIER, padding: `${PADDING_Y}px ${PADDING_X}px`, textAlign: visual.style.textAlign || 'center', textDecoration: visual.style.textDecoration || 'none', color: visual.style.textColor || '#333333', backgroundColor: visual.style.color, border: `${visual.style.borderWidth || 0}px ${visual.style.borderStyle === 'dashed' ? 'dashed' : visual.style.borderStyle === 'dotted' ? 'dotted' : 'solid'} ${visual.style.borderColor || 'transparent'}`, borderRadius: visual.style.shape === 'roundedRect' ? '8px' : '0px', boxSizing: 'border-box', outline: 'none', boxShadow: 'none', transition: 'none', pointerEvents: 'auto', overflow: 'hidden' }}
                className="z-50 rounded-md outline-none resize-none"
              />
            </div>
          );
        })()}

        <div className="w-full h-full pt-12 relative" style={{ backgroundColor }}>
          <Stage
            ref={stageRef} width={dimensions.width} height={dimensions.height} scaleX={scale} scaleY={scale} x={pos.x} y={pos.y}
            onWheel={(e) => {
              e.evt.preventDefault();
              const stage = e.target.getStage();
              if (!stage) return;
              if (e.evt.ctrlKey) {
                const scaleBy = 1.05;
                const oldScale = stage.scaleX();
                const pointerPos = stage.getPointerPosition();
                if (!pointerPos) return;
                const mousePointTo = { x: (pointerPos.x - stage.x()) / oldScale, y: (pointerPos.y - stage.y()) / oldScale };
                const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                setScale(newScale);
                setPos({ x: pointerPos.x - mousePointTo.x * newScale, y: pointerPos.y - mousePointTo.y * newScale });
              } else {
                setPos({ x: pos.x - e.evt.deltaX, y: pos.y - e.evt.deltaY });
              }
            }}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              if (!stage) return;
              const isPanIntent = (e.evt.ctrlKey && e.evt.button === 0) || e.evt.button === 1;
              if (e.target === stage) {
                if (isPanIntent) { setIsPanning(true); isSelecting.current = false; } 
                else if (e.evt.button === 0) {
                  setIsPanning(false); isSelecting.current = true;
                  const pos = stage.getPointerPosition();
                  if (!pos) return;
                  const unscaledPos = { x: (pos.x - stage.x()) / stage.scaleX(), y: (pos.y - stage.y()) / stage.scaleY() };
                  selectionStartPos.current = unscaledPos;
                  setSelectionRect({ x: unscaledPos.x, y: unscaledPos.y, width: 0, height: 0, visible: true });
                  if (!e.evt.shiftKey) setSelectedNodeIds([]);
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
                const rect = { x1: x, y1: y, x2: x + width, y2: y + height };
                const newlySelectedIds = visibleNodes.filter((node) => node.x > rect.x1 && node.x < rect.x2 && node.y > rect.y1 && node.y < rect.y2).map((node) => node.id);
                if (e.evt.shiftKey) setSelectedNodeIds(prevIds => [...new Set([...prevIds, ...newlySelectedIds])]);
                else setSelectedNodeIds(newlySelectedIds);
              }
            }}
            onMouseMove={(e) => {
              if (isPanning) { setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY }); } 
              else if (isSelecting.current) {
                const stage = e.target.getStage(); if (!stage) return;
                const pos = stage.getPointerPosition(); if (!pos) return;
                const currentUnscaledPos = { x: (pos.x - stage.x()) / stage.scaleX(), y: (pos.y - stage.y()) / stage.scaleY() };
                const start = selectionStartPos.current;
                setSelectionRect({ visible: true, x: Math.min(start.x, currentUnscaledPos.x), y: Math.min(start.y, currentUnscaledPos.y), width: Math.abs(start.x - currentUnscaledPos.x), height: Math.abs(start.y - currentUnscaledPos.y) });
              }
            }}
            onDblClick={(e) => {
              const stage = e.target.getStage(); if (e.target !== stage || !stage) return;
              const pointerPos = stage.getPointerPosition(); if (!pointerPos) return;
              const worldX = (pointerPos.x - pos.x) / scale;
              const worldY = (pointerPos.y - pos.y) / scale;
              const newId = uuidv4();
              const newNodeData: NodeData = { id: newId, nodeText: 'Chủ đề nổi', x: worldX, y: worldY, parentId: undefined };
              const newNodes = [...nodes, newNodeData];
              setGraph(newNodes, edges);
              startEditing(newId);
              debouncedPushHistory();
              debouncedPersistData();
              sendPatch('NODE_CREATE', { node: newNodeData, edge: null });
            }}
            style={{ cursor: isPanning ? 'grabbing' : 'default', position: 'absolute', top: 0, left: 0 }}
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
                } else {
                  // Mindmap & Logic logic
                  const offsetXFrom = fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2;
                  const offsetXTo = toSide === 'left' ? toBox.w / 2 : -toBox.w / 2;
                  if (edge.from === 'root' && globalStructure === 'mindmap') {
                     p1 = { x: fromStyle.x + (toSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  } else {
                     p1 = { x: fromStyle.x + offsetXFrom, y: fromStyle.y };
                  }
                  p4 = { x: toStyle.x + offsetXTo, y: toStyle.y };
                  points = [p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y];
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
                }
                
                const isBezier = toStyle.branchLineStyle === 'bezier' && globalStructure !== 'org';
                const lineProps = { points, stroke: strokeColor, strokeWidth: branchLineWidth || 2, bezier: isBezier, lineCap: 'round' as const, lineJoin: 'round' as const };
                if (toStyle.branchLineEnd === 'arrow') return <Arrow {...lineProps} key={edge.id} pointerLength={8} pointerWidth={6} fill={strokeColor} />;
                return <Line {...lineProps} key={edge.id} />;
              })}

              {visibleNodes.map((node) => {
                const visual = nodeVisuals.get(node.id);
                if (!visual) return null;
                const { style, box } = visual;
                const { w, h, textToRender, finalFontSize } = box;
                const isSelected = selectedIdsSet.has(node.id);
                const isDropTarget = node.id === dropTargetId;
                const hasChildren = nodesWithChildren.has(node.id);
                const shapeProps = { width: w, height: h, offsetX: w / 2, offsetY: h / 2, fill: style.color, stroke: isDropTarget ? "#34d399" : (isSelected ? "#3b82f6" : style.borderColor), strokeWidth: isDropTarget ? 4 : (isSelected ? 3 : (style.borderWidth || 0)), dash: style.borderStyle === 'dashed' ? [8, 4] : (style.borderStyle === 'dotted' ? [2, 3] : undefined) };
                
                return (
                  <Group
                    key={node.id} id={node.id} x={style.x} y={style.y} draggable
                    onDragStart={() => handleDragStart(node.id)} onDragMove={(e) => handleDragMove(e, node.id)} onDragEnd={(e) => handleDragEnd(e, node.id)}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (e.evt.shiftKey) setSelectedNodeIds(prevIds => { const newSet = new Set(prevIds); if (newSet.has(node.id)) newSet.delete(node.id); else newSet.add(node.id); return Array.from(newSet); });
                      else setSelectedNodeIds([node.id]);
                    }}
                    onDblClick={(e) => { e.cancelBubble = true; startEditing(node.id); }}
                    onMouseEnter={() => setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    {(style.shape === 'rectangle' || style.shape === 'roundedRect') && <Rect {...shapeProps} cornerRadius={style.shape === 'roundedRect' ? 8 : 0} />}
                    <Text visible={editingNodeId !== node.id} text={textToRender || '(...)'} width={w} height={h} offsetX={w / 2} offsetY={h / 2} align={style.textAlign} verticalAlign="middle" fill={style.textColor} padding={PADDING_Y} listening={false} fontSize={finalFontSize} fontStyle={style.fontStyle === 'italic' ? 'italic' : style.fontWeight} fontFamily={style.fontFamily} textDecoration={style.textDecoration === 'none' ? undefined : style.textDecoration} lineHeight={LINE_HEIGHT_MULTIPLIER} />
                    
                    {node.id === 'root' ? (
                      <>
                        {rootChildSides.left && (
                          <Group x={-w / 2} y={0} onClick={(e) => handleToggleCollapse(e, 'root', 'left')} onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }} onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}>
                            <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                            {rootCollapse.left ? <Text text={`${descendantCounts.rootCounts.left || 0}`} fontSize={9} fill="#FFFFFF" align="center" verticalAlign="middle" width={16} height={16} offsetX={8} offsetY={8} fontStyle="bold" listening={false} /> : <Path data="M-4 0 H4" stroke="#FFFFFF" strokeWidth={2} lineCap="round" />}
                          </Group>
                        )}
                        {rootChildSides.right && (
                          <Group x={w / 2} y={0} onClick={(e) => handleToggleCollapse(e, 'root', 'right')} onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }} onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}>
                            <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                            {rootCollapse.right ? <Text text={`${descendantCounts.rootCounts.right || 0}`} fontSize={9} fill="#FFFFFF" align="center" verticalAlign="middle" width={16} height={16} offsetX={8} offsetY={8} fontStyle="bold" listening={false} /> : <Path data="M-4 0 H4" stroke="#FFFFFF" strokeWidth={2} lineCap="round" />}
                          </Group>
                        )}
                      </>
                    ) : (
                      hasChildren && (
                        <Group x={(style.side === 'left' ? -w / 2 : w / 2)} y={0} onClick={(e) => handleToggleCollapse(e, node.id)} onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }} onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}>
                          <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                          {node.collapsed ? <Text text={`${descendantCounts.counts.get(node.id) || 0}`} fontSize={9} fill="#FFFFFF" align="center" verticalAlign="middle" width={16} height={16} offsetX={8} offsetY={8} fontStyle="bold" listening={false} /> : <Path data="M-4 0 H4" stroke="#FFFFFF" strokeWidth={2} lineCap="round" />}
                        </Group>
                      )
                    )}
                    {(style as any).hyperlink && (
                      <Group x={w / 2 - 10} y={-h / 2 + 10} onClick={(e) => { e.cancelBubble = true; window.open((style as any).hyperlink, '_blank', 'noopener,noreferrer'); }} onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'pointer'; }} onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }} title={`Mở link: ${(style as any).hyperlink}`}>
                        <Circle radius={9} fill="#E0E7FF" stroke="#4F46E5" strokeWidth={1} />
                        <Path data="M9.25 10.75a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-1.5a.75.75 0 0 0-1.5 0v1.5h-1.5a.75.75 0 0 0 0 1.5h1.5v1.5Z M3.75 5.5a2 2 0 0 1 2-2h4.5a2 2 0 0 1 2 2v1a.75.75 0 0 0 1.5 0v-1a3.5 3.5 0 0 0-3.5-3.5h-4.5A3.5 3.5 0 0 0 2.25 5.5v5A3.5 3.5 0 0 0 5.75 14h1a.75.75 0 0 0 0-1.5h-1a2 2 0 0 1-2-2v-5Z" fill="#4F46E5" scale={{ x: 0.8, y: 0.8 }} offsetX={10} offsetY={10} />
                      </Group>
                    )}
                  </Group>
                );
              })}
              <Rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} fill="rgba(0, 100, 255, 0.3)" stroke="#0064FF" strokeWidth={1} visible={selectionRect.visible} />
              {/* [MỚI] CursorLayer để hiển thị con trỏ chuột của người khác */}
              
            </Layer>
            <CursorLayer /> 
          </Stage>
          {isFormattingToolbarOpen && (
            <FormattingToolbar
              selectedIds={selectedNodeIds} currentNode={currentNode} currentBackgroundColor={backgroundColor} globalStructure={globalStructure} activeColorThemeId={activeColorThemeId}
              onApplyLayout={(structure) => { pushHistory(nodes, edges); setGlobalStore({ globalStructure: structure }); handleLayout(false); useEditorStore.setState({ isDirty: true }); }}
              onSetBackgroundColor={(color) => { handleSetBackgroundColor(color); useEditorStore.setState({ isDirty: true }); }}
              onSetGlobalFont={(font) => { pushHistory(nodes, edges); useEditorStore.setState({ globalFont: font, isDirty: true }); }}
              onSetBranchLineWidth={(width) => { pushHistory(nodes, edges); useEditorStore.setState({ branchLineWidth: width, isDirty: true }); }}
              onToggleColoredBranch={(state) => handleToggleColoredBranch(state)}
              onSetGlobalBranchColor={handleSetGlobalBranchColor}
              onSetActiveColorTheme={(themeName) => { pushHistory(nodes, edges); setGlobalStore({ activeColorThemeId: themeName }); setBackgroundColor(colorThemes[themeName as keyof typeof colorThemes].background); }}
              onUpdateNode={handleUpdateNode} onApplyQuickStyle={handleApplyQuickStyle} onCopyStyle={handleCopyStyle} onPasteStyle={handlePasteStyle} onResetStyle={handleResetStyle}

            />
           
          )}
          {!isConnected && isAuthed && !isGuest && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-sm font-medium">Mất kết nối máy chủ. Đang thử lại...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}