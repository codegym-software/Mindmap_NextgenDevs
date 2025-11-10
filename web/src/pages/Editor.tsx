import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Stage, Layer, Group, Rect, Text, Line, Circle, Path, Arrow } from "react-konva";
import * as dagre from 'dagre';

import EditorToolbar from "../features/editor/EditorToolbar";
import Sidebar from "../components/layout/Sidebar";
import FormattingToolbar from "../features/editor/FormattingToolbar";
import {
  useEditorStore, NodeData, EdgeData, GlobalStructure, QuickStyleId,
  ColorTheme,
  colorThemes,
  fonts,
  getNodeComputedStyle,
  applyNodeDefaults,
  DEFAULT_NODE_STYLE, // SỬA: Đã thêm import
} from "../app/store/useEditorStore";
import { mindmapsApi } from "../services/mindmapsApi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { useTheme } from "../hooks/useTheme";
import Spinner from "../components/common/Spinner";

type MindmapDoc = { id?: string; name: string; content: { nodes: Record<string, NodeData>; edges: EdgeData[] } };

const GUEST_BUCKET = "mm_guest_docs";

const PADDING_X = 20, PADDING_Y = 12;
const MIN_NODE_W = 80;
const MIN_NODE_H = 40;

// =================================================================================
// Component
// =================================================================================

function loadGuestDoc(id: string): MindmapDoc | null {
  try {
    const raw = localStorage.getItem(GUEST_BUCKET);
    return raw ? JSON.parse(raw)[id] || null : null;
  } catch { return null; }
}
function saveGuestDoc(id: string, doc: MindmapDoc) {
  const all = JSON.parse(localStorage.getItem(GUEST_BUCKET) || "{}");
  all[id] = doc;
  localStorage.setItem(GUEST_BUCKET, JSON.stringify(all));
}

export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { toggleTheme } = useTheme();
  const { isAuthed, login } = useAuth();
  const isGuest = !!id && id.startsWith("guest-");

  // State từ store
  const {
    nodes, edges, setGraph, push: pushHistory, undo, redo, clear: clearHistory,
    globalStructure, globalFont, branchLineWidth, isColoredBranch, activeColorThemeId,
    set: setGlobalStore
  } = useEditorStore();

  const [name, setName] = useState("Loading...");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFormattingToolbarOpen, setFormattingToolbarOpen] = useState(true);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight - 56 });
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: (window.innerHeight - 56) / 2 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("root");
  const [isPanning, setIsPanning] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dragStartState, setDragStartState] = useState<{ nodes: NodeData[], edges: EdgeData[] } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#FAFAFB');
  const [styleClipboard, setStyleClipboard] = useState<Partial<NodeData> | null>(null);

  const stageRef = useRef<any>(null);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);
  const activeTheme = colorThemes[activeColorThemeId as keyof typeof colorThemes];

  // Map
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const nodesWithChildren = useMemo(() => new Set(edges.map(e => e.from)), [edges]);

  // Lấy node object hiện tại
  const currentNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeMap.get(selectedNodeId) || null;
  }, [selectedNodeId, nodeMap]);

  // Tính toán style
  const computedNodeStyles = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach(node => {
      map.set(node.id, getNodeComputedStyle(node, activeTheme, globalFont));
    });
    return map;
  }, [nodes, activeTheme, globalFont]);


  // Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight - 56 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsDataLoaded(false);
      if (!id) {
        if (isAuthed) { navigate("/dashboard", { replace: true }); return; }
        const newId = "guest-" + Date.now();
        const newDoc: MindmapDoc = { name: "Mindmap nháp", content: { nodes: { root: { id: "root", text: "Chủ đề chính", x: 0, y: 0 } }, edges: [] } };
        saveGuestDoc(newId, newDoc);
        if (isMounted) navigate(`/editor/${newId}`, { replace: true });
        return;
      }
      try {
        let data: MindmapDoc | null = null;
        if (isGuest) {
          data = loadGuestDoc(id) || { name: "Mindmap Lỗi", content: { nodes: {}, edges: [] } };
        } else {
          if (!isAuthed) { addToast("Vui lòng đăng nhập để xem mindmap này.", "info"); }
          data = await mindmapsApi.get(id);
        }
        if (!data.content?.nodes?.root) { data.content = { nodes: { root: { id: "root", text: "Chủ đề chính", x: 0, y: 0 } }, edges: [] }; }

        if (isMounted) {
          setName(data.name);
          const loadedNodes = Object.values(data.content.nodes);
          clearHistory();
          setGraph(loadedNodes, data.content.edges);
          pushHistory(loadedNodes, data.content.edges);
          const theme = colorThemes[activeColorThemeId as keyof typeof colorThemes];
          setBackgroundColor(theme.background);
          setSelectedNodeId("root");
          setIsDataLoaded(true);
        }
      } catch (error) {
        if (isMounted) { addToast("Không thể tải mindmap!", "error"); navigate("/dashboard", { replace: true }); }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id, isAuthed, navigate, addToast, clearHistory, setGraph, pushHistory, activeColorThemeId]);

  // Auto-save
  useEffect(() => {
    if (!isDataLoaded) return;

    const handler = setTimeout(() => {
      if (!id) return;

      const currentNodes = useEditorStore.getState().nodes;
      const currentEdges = useEditorStore.getState().edges;

      const docToSave: Omit<MindmapDoc, 'id'> = {
        name,
        content: {
          nodes: Object.fromEntries(currentNodes.map(n => [n.id, n])),
          edges: currentEdges,
        },
      };

      if (isGuest) {
        saveGuestDoc(id, { id, ...docToSave });
      } else if (isAuthed) {
        mindmapsApi.update(id, docToSave).catch(e => {
          console.error("Auto-save failed:", e);
        });
      }
    }, 1500);

    return () => {
      clearTimeout(handler);
    };
  }, [nodes, edges, name, isDataLoaded, id, isGuest, isAuthed, addToast]);

  // Save
  const handleSave = () => {
    if (!isAuthed) {
      addToast("Vui lòng đăng nhập để lưu mindmap.", "info");
      login();
    } else if (id) {
      const content = { nodes: Object.fromEntries(nodes.map(n => [n.id, n])), edges };
      mindmapsApi.update(id, { name, content })
        .then(() => addToast("Đã lưu mindmap!", "success"))
        .catch(e => {
          console.error("Save failed:", e);
          addToast("Lưu thất bại", "error");
        });
    }
  };

  // ================================================
  // Style & Layout Logic
  // ================================================

  const getNodeBox = useCallback((node: NodeData | null) => {
    if (!node) return { w: 0, h: 0, textToRender: '', finalFontSize: 14 };
    
    const style = computedNodeStyles.get(node.id);
    if (!style) return { w: 0, h: 0, textToRender: '', finalFontSize: 14 };

    const { fontSize, nodeLength, text, textCase, shape } = style;
    
    let processedText = text || "";
    if (textCase === 'uppercase') processedText = processedText.toUpperCase();
    if (textCase === 'lowercase') processedText = processedText.toLowerCase();

    const finalFontSize = fontSize || 14;
    const finalLineHeight = finalFontSize * 1.3;

    let w: number;
    let wrappedLines: string[] = [];

    if (nodeLength === 'fit') {
      const approxCharWidth = finalFontSize * 0.6;
      const nodeWidthChars = 25;
      w = Math.max(MIN_NODE_W, (nodeWidthChars * approxCharWidth) + PADDING_X * 2);
    } else {
      w = Math.max(MIN_NODE_W, Number(nodeLength) || MIN_NODE_W);
    }

    // Logic ngắt dòng
    const lines = processedText.split("\n");
    const maxChars = Math.max(10, (w - PADDING_X * 2) / (finalFontSize * 0.6));
    
    lines.forEach(line => {
      if (line.length === 0) {
        wrappedLines.push('');
        return;
      }
      
      let currentLine = "";
      const words = line.split(' ');
      
      for (const word of words) {
        if (word.length > maxChars) {
          if (currentLine) wrappedLines.push(currentLine);
          wrappedLines.push(word);
          currentLine = "";
        } else if ((currentLine + " " + word).length > maxChars) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? " " : "") + word;
        }
      }
      if (currentLine) wrappedLines.push(currentLine);
    });
    
    let h = Math.max(MIN_NODE_H, wrappedLines.length * finalLineHeight + PADDING_Y * 2);
    
    // SỬA: Hình tròn/thoi phải là hình vuông
    if (shape === 'circle' || shape === 'diamond') {
      w = Math.max(w, h);
      h = w;
    }

    return { w, h, textToRender: wrappedLines.join("\n"), finalFontSize };
  }, [computedNodeStyles]);

  // SỬA: handleLayout
  const handleLayout = useCallback((nodesToLayout: NodeData[], edgesToLayout: EdgeData[]) => {
    const layoutType = globalStructure;
    
    const g = new dagre.graphlib.Graph();
    const rankdir = layoutType === 'org' ? 'TB' : 'LR';
    
    g.setGraph({ rankdir: rankdir, nodesep: 50, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    const nodesToLayoutIds = new Set(nodesToLayout.map(n => n.id));
    
    nodesToLayout.forEach(node => {
      const { w, h } = getNodeBox(node);
      g.setNode(node.id, { label: node.text, width: w, height: h });
    });
    
    edgesToLayout.filter(e => nodesToLayoutIds.has(e.from) && nodesToLayoutIds.has(e.to))
         .forEach(edge => g.setEdge(edge.from, edge.to));

    dagre.layout(g);

    let newNodes = [...nodes];
    const nodePositions = new Map<string, { x: number, y: number, side?: 'left' | 'right' }>();
    g.nodes().forEach(nodeId => {
      const n = g.node(nodeId);
      if (n) nodePositions.set(nodeId, { x: n.x, y: n.y });
    });

    if (layoutType === 'mindmap') {
      const rootPos = nodePositions.get('root') || { x: 0, y: 0 };
      const childrenOfRoot = edges.filter(e => e.from === 'root').map(e => e.to);
      const midPoint = Math.ceil(childrenOfRoot.length / 2);

      childrenOfRoot.forEach((childId, index) => {
        const side = index < midPoint ? 'left' : 'right';
        const dfsAssignSide = (id: string, s: 'left' | 'right') => {
          const pos = nodePositions.get(id);
          if (pos) {
            pos.side = s;
            if (id !== 'root' && s === 'left') {
              const deltaX = pos.x - rootPos.x;
              pos.x = rootPos.x - deltaX;
            }
          }
          edges.filter(e => e.from === id).forEach(e => dfsAssignSide(e.to, s));
        };
        dfsAssignSide(childId, side);
      });
    } else {
      // Gán 'side' cho logic/org
      nodePositions.forEach(pos => pos.side = 'right');
    }
    
    newNodes = nodes.map(n => {
      const pos = nodePositions.get(n.id);
      if (pos) {
        return { ...n, x: pos.x, y: pos.y, side: pos.side };
      }
      return n; // Giữ nguyên node nổi
    });

    setGraph(newNodes, edges);
  }, [nodes, edges, globalStructure, getNodeBox, setGraph]);

  // SỬA: Tách logic AutoLayout
  const runAutoLayout = useCallback(() => {
    const nodesToLayout = nodes.filter(n => n.id === 'root' || n.parentId);
    const edgesToLayout = edges.filter(e => nodeMap.has(e.from) && nodeMap.has(e.to));
    handleLayout(nodesToLayout, edgesToLayout);
  }, [nodes, edges, nodeMap, handleLayout]);

  // ================================================
  // Node Actions
  // ================================================

  const updateNode = (id: string, updates: Partial<NodeData>) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    setGraph(newNodes, edges);
  };
  
  const handleAddChild = useCallback((parentId: string) => {
    const parent = computedNodeStyles.get(parentId);
    if (!parent) return;

    const newId = "n" + Date.now();
    const newNodeData: NodeData = { 
      id: newId, 
      text: "", 
      x: parent.x + (parent.side === 'left' ? -200 : 200),
      y: parent.y, 
      parentId,
      side: parent.side,
      branchColor: parent.branchColor,
      branchLineEnd: parent.branchLineEnd,
      branchLineStyle: parent.branchLineStyle,
      branchLineThickness: parent.branchLineThickness,
    };
    const newEdgeData: EdgeData = { id: `e-${newId}`, from: parentId, to: newId };
    
    const newNodes = [...nodes, newNodeData];
    const newEdges = [...edges, newEdgeData];

    pushHistory(nodes, edges);
    setGraph(newNodes, newEdges);
    startEditing(newId);
    
    // SỬA: Chạy AutoLayout
    setTimeout(() => runAutoLayout(), 50);

  }, [nodes, edges, pushHistory, setGraph, computedNodeStyles, runAutoLayout]); // Thêm startEditing, runAutoLayout
  
  const handleAddSibling = useCallback((nodeId: string) => {
    if (nodeId === 'root') { handleAddChild('root'); return; }
    const parentId = nodes.find(n => n.id === nodeId)?.parentId;
    if (parentId) handleAddChild(parentId);
  }, [nodes, handleAddChild]);


  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root' || !selectedNodeId) return;
    const nodesToDelete = new Set<string>([nodeId]);
    const findChildren = (id: string) => {
      edges.forEach(e => {
        if (e.from === id) {
          nodesToDelete.add(e.to);
          findChildren(e.to);
        }
      });
    };
    findChildren(nodeId);

    const parentId = nodes.find(n => n.id === nodeId)?.parentId ?? 'root';
    const newNodes = nodes.filter(n => !nodesToDelete.has(n.id));
    const newEdges = edges.filter(e => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to));
    
    pushHistory(nodes, edges);
    setGraph(newNodes, newEdges);
    setSelectedNodeId(parentId);
    
    // SỬA: Chạy AutoLayout
    setTimeout(() => runAutoLayout(), 50);

  }, [nodes, edges, pushHistory, setGraph, selectedNodeId, runAutoLayout]);

  const startEditing = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
    setTimeout(() => {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }, 50);
  }, []);
  
  const stopEditing = useCallback((save: boolean) => {
    if (!editingNodeId) return;
    const node = nodes.find(n => n.id === editingNodeId);
    if (!node) return;
    
    const newText = editingInputRef.current?.value ?? node.text;
    setEditingNodeId(null);

    if (save && newText !== node.text) {
      const newNodes = nodes.map(n => n.id === editingNodeId ? { ...n, text: newText } : n);
      pushHistory(nodes, edges);
      setGraph(newNodes, edges);
    }
  }, [editingNodeId, nodes, edges, setGraph, pushHistory]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingNodeId) return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (!selectedNodeId) return;

    if (e.key === 'Tab') { e.preventDefault(); handleAddChild(selectedNodeId); }
    else if (e.key === 'Enter') { e.preventDefault(); handleAddSibling(selectedNodeId); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteNode(selectedNodeId); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'F2') { e.preventDefault(); startEditing(selectedNodeId); }
    else if (e.key.length === 1 && /^[a-zA-Z0-9\S]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); 
      startEditing(selectedNodeId); 
      setTimeout(() => {
        if (editingInputRef.current) editingInputRef.current.value = e.key;
      }, 50);
    }
  }, [editingNodeId, selectedNodeId, handleAddChild, handleAddSibling, handleDeleteNode, undo, redo, startEditing]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ================================================
  // Drag & Drop
  // ================================================

  const handleDragStart = (nodeId: string) => {
    setDragStartState({ nodes, edges });
    const node = stageRef.current?.findOne(`#${nodeId}`);
    if (node && editingNodeId === nodeId) {
      node.stopDrag();
    }
  };

  const handleDragMove = (e: any, draggedNodeId: string) => {
    const pos = e.target.position();
    // Cập nhật vị trí realtime
    const newNodes = nodes.map(n => n.id === draggedNodeId ? {...n, x: pos.x, y: pos.y} : n);
    setGraph(newNodes, edges);

    let targetFound: string | null = null;
    for (const node of nodes) {
      if (node.id === draggedNodeId) continue;
      const { w, h } = getNodeBox(node);
      const isOver = (
        pos.x > node.x - w / 2 && pos.x < node.x + w / 2 &&
        pos.y > node.y - h / 2 && pos.y < node.y + h / 2
      );
      if (isOver) {
        targetFound = node.id;
        break;
      }
    }
    setDropTargetId(targetFound);
  };

  const handleDragEnd = (e: any, draggedNodeId: string) => {
    if (dragStartState) {
      pushHistory(dragStartState.nodes, dragStartState.edges);
    }
    setDragStartState(null);

    const finalX = e.target.x();
    const finalY = e.target.y();
    let newNodes = [...nodes];
    let newEdges = [...edges];
    
    if (dropTargetId && dropTargetId !== draggedNodeId) {
      const draggedNode = nodes.find(n => n.id === draggedNodeId);
      if (!draggedNode) return;
      
      let isDroppingOnChild = false;
      const checkChildren = (id: string) => {
        if (id === dropTargetId) { isDroppingOnChild = true; return; }
        edges.filter(e => e.from === id).forEach(e => checkChildren(e.to));
      };
      checkChildren(draggedNodeId);

      if (isDroppingOnChild) {
        addToast("Không thể di chuyển node cha vào node con!", "error");
        setGraph(dragStartState?.nodes || nodes, dragStartState?.edges || edges);
        setDropTargetId(null);
        return;
      }

      const newParentId = dropTargetId;
      const oldEdge = edges.find(e => e.to === draggedNodeId);

      if (oldEdge) {
        newEdges = edges.map(e => e.id === oldEdge.id ? { ...e, from: newParentId } : e);
      } else {
        newEdges = [...edges, { id: `e-${draggedNodeId}`, from: newParentId, to: draggedNodeId }];
      }
      
      newNodes = nodes.map(n => n.id === draggedNodeId ? { ...n, parentId: newParentId, x: finalX, y: finalY } : n);
      
    } else {
      // Logic Move (thành node nổi)
      newNodes = nodes.map(n => n.id === draggedNodeId ? {...n, x: finalX, y: finalY, parentId: undefined, side: undefined } : n);
      newEdges = edges.filter(e => e.to !== draggedNodeId);
    }
    
    setGraph(newNodes, newEdges);
    setDropTargetId(null);
    
    // SỬA: Chạy AutoLayout sau khi kéo
    setTimeout(() => runAutoLayout(), 50);
  };
  
  // ================================================
  // Handlers cho Toolbar
  // ================================================

  const handleUpdateNode = (id: string, updates: Partial<NodeData>) => {
    pushHistory(nodes, edges);
    const newNodes = nodes.map(n => (n.id === id ? { ...n, ...updates } : n));
    setGraph(newNodes, edges);
  };
  
  const handleApplyQuickStyle = (styleId: QuickStyleId) => {
    if (!selectedNodeId) return;
    pushHistory(nodes, edges);
    const newNodes = nodes.map(n => (n.id === selectedNodeId ? { ...n, quickStyleId: styleId } : n));
    setGraph(newNodes, edges);
  };

  const handleCopyStyle = () => {
    if (!currentNode) return;
    const styleToCopy: Partial<NodeData> = {};
    Object.keys(DEFAULT_NODE_STYLE).forEach(key => {
      const typedKey = key as keyof NodeData;
      if (currentNode[typedKey] !== undefined) {
        (styleToCopy as any)[typedKey] = currentNode[typedKey];
      }
    });
    setStyleClipboard(styleToCopy);
    addToast("Đã sao chép kiểu!", "success");
  };

  const handlePasteStyle = () => {
    if (!selectedNodeId || !styleClipboard) return;
    pushHistory(nodes, edges);
    const newNodes = nodes.map(n => (n.id === selectedNodeId ? { ...n, ...styleClipboard } : n));
    setGraph(newNodes, edges);
  };

  const handleResetStyle = () => {
    if (!selectedNodeId || !currentNode) return;
    pushHistory(nodes, edges);
    const resetStyle = applyNodeDefaults(currentNode, activeTheme);
    const newNodes = nodes.map(n => (n.id === selectedNodeId ? { ...n, ...resetStyle } : n));
    setGraph(newNodes, edges);
  };

  // ================================================
  // Logic Collapse
  // ================================================
  
  const handleToggleCollapse = useCallback((e: any, nodeId: string) => {
    e.cancelBubble = true;
    pushHistory(nodes, edges);
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n);
    setGraph(newNodes, edges);
  }, [nodes, edges, pushHistory, setGraph]);

  const isNodeVisible = useCallback((nodeId: string): boolean => {
    const node = nodeMap.get(nodeId);
    if (!node) return false;
    if (nodeId === 'root' || !node.parentId) return true;
    
    const parent = nodeMap.get(node.parentId);
    if (!parent) return true;
    if (parent.collapsed) return false;
    if (!parent.parentId) return true; 
    return isNodeVisible(parent.parentId);
  }, [nodeMap]);

  const visibleNodes = useMemo(() => nodes.filter(n => isNodeVisible(n.id)), [nodes, isNodeVisible]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)), [edges, visibleNodeIds]);

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

  // ================================================
  // Vị trí Text Area
  // ================================================

  const editingNodePosition = useMemo(() => {
    if (!editingNodeId) return null;
    const node = computedNodeStyles.get(editingNodeId);
    if (!node || !stageRef.current) return null;
    
    const { w, h, finalFontSize } = getNodeBox(node);
    const stageRect = stageRef.current.container().getBoundingClientRect();
    const absPos = stageRef.current.getAbsoluteTransform().point({ x: node.x, y: node.y });
    
    return { 
      left: stageRect.left + absPos.x - w / 2, 
      top: stageRect.top + absPos.y - h / 2, 
      width: w, 
      height: h,
      fontSize: finalFontSize,
      fontStyle: node.id === 'root' ? 'bold' : node.fontWeight,
      textAlign: node.textAlign,
      // SỬA: Thêm màu chữ cho textarea
      color: node.textColor,
    };
  }, [editingNodeId, computedNodeStyles, scale, pos, getNodeBox]);

  // ================================================
  // Render
  // ================================================

  // SỬA: Thêm Google Fonts
  const fontLink = useMemo(() => {
    const fontFamilies = fonts.map(f => f.value.replace(/ /g, '+')).join('|');
    return `https://fonts.googleapis.com/css?family=${fontFamilies}&display=swap`;
  }, []);

  if (!isDataLoaded) {
    return <div className="w-screen h-screen bg-white flex items-center justify-center text-black gap-2"><Spinner />Đang tải...</div>;
  }
 
  return (
    <div className="w-screen h-screen bg-white overflow-hidden flex flex-col">
      {/* SỬA: Thêm thẻ style cho Fonts */}
      <style>
        {`@import url('${fontLink}');`}
      </style>
      
      <EditorToolbar
        name={name}
        onNameChange={setName}
        onCommitName={() => { /* Auto-save */ }}
        onDashboard={() => navigate("/dashboard")}
        onUndo={undo}
        onRedo={redo}
        onShare={() => { 
          navigator.clipboard.writeText(window.location.href);
          addToast("Đã sao chép link chia sẻ!", "success");
        }}
        onTheme={toggleTheme}
        onSave={handleSave}
        onToggleFormattingToolbar={() => setFormattingToolbarOpen(!isFormattingToolbarOpen)}
      />
      <Sidebar />
      
      {editingNodeId && editingNodePosition && ( 
        <textarea 
          ref={editingInputRef} 
          defaultValue={nodes.find(n => n.id === editingNodeId)?.text} 
          onBlur={() => stopEditing(true)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stopEditing(true); }
            else if (e.key === 'Escape') { stopEditing(false); }
          }}
          style={{ 
            position: 'absolute', 
            left: editingNodePosition.left,
            top: editingNodePosition.top,
            width: editingNodePosition.width,
            height: editingNodePosition.height,
            fontSize: `${editingNodePosition.fontSize}px`,
            fontWeight: editingNodePosition.fontStyle,
            lineHeight: 1.3,
            padding: `${PADDING_Y}px ${PADDING_X}px`,
            textAlign: editingNodePosition.textAlign,
            color: editingNodePosition.color, // Sửa: Dùng màu động
            backgroundColor: 'transparent',
          }} 
          className="absolute z-50 bg-white rounded-md outline-none resize-none ring-2 ring-blue-500/70" 
        /> 
      )}
      
      <div className="w-full h-full pt-14 relative" style={{ backgroundColor }}>
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          scaleX={scale} scaleY={scale}
          x={pos.x} y={pos.y}
          onWheel={(e) => {
             e.evt.preventDefault();
             const scaleBy = 1.05;
             const stage = e.target.getStage();
             if (!stage) return;
             const oldScale = stage.scaleX();
             const pointerPosition = stage.getPointerPosition();
             if (!pointerPosition) return;
             const mousePointTo = {
               x: (pointerPosition.x - stage.x()) / oldScale,
               y: (pointerPosition.y - stage.y()) / oldScale,
             };
             const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
             setScale(newScale);
             setPos({
               x: pointerPosition.x - mousePointTo.x * newScale,
               y: pointerPosition.y - mousePointTo.y * newScale,
             });
          }}
          onMouseDown={(e) => {
            if (e.evt.button === 1 || (e.evt.button === 0 && e.target === e.target.getStage())) { 
              setIsPanning(true); 
            }
            if (e.target === e.target.getStage()) {
              setSelectedNodeId(null);
              if(editingNodeId) stopEditing(true);
            }
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseMove={(e) => {
            if (isPanning) setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY });
          }}
          onDblClick={(e) => {
            const stage = e.target.getStage();
            if (e.target !== stage || !stage) return;
            const pointerPos = stage.getPointerPosition();
            if (!pointerPos) return;
            const worldX = (pointerPos.x - pos.x) / scale;
            const worldY = (pointerPos.y - pos.y) / scale;
            
            const newId = "n" + Date.now();
            const newNodeData: NodeData = {
              id: newId, text: "Chủ đề nổi", x: worldX, y: worldY, parentId: undefined,
            };
            
            const newNodes = [...nodes, newNodeData];
            pushHistory(nodes, edges);
            setGraph(newNodes, edges);
            startEditing(newId);
          }}
          style={{ cursor: isPanning ? 'grabbing' : 'default', position: 'absolute', top: 0, left: 0 }}
        >
          <Layer>
            {visibleEdges.map((edge) => {
              const from = computedNodeStyles.get(edge.from);
              const to = computedNodeStyles.get(edge.to);
              
              if (!from || !to) return null;

              const { w: fromW } = getNodeBox(from);
              const { w: toW, h: toH } = getNodeBox(to);
              
              const p1 = { x: from.x + (from.side === 'left' ? -fromW / 2 : fromW / 2), y: from.y };
              let p4 = { x: to.x + (to.side === 'left' ? toW / 2 : -toW / 2), y: to.y };
              
              // SỬA: Cho Org Chart (TB)
              if (globalStructure === 'org') {
                 p1.x = from.x;
                 p1.y = from.y + getNodeBox(from).h / 2; // Đi từ dưới
                 p4.x = to.x;
                 p4.y = to.y - toH / 2; // Đi vào trên
              }
              
              // Sửa: Lấy màu từ style
              const strokeColor = to.branchColor || '#B0B0B0';
              // Sửa: Tính toán độ dày
              const thicknessMap = { thin: 1, normal: 2, thick: 4 };
              const strokeWidth = thicknessMap[to.branchLineThickness || 'normal'] * branchLineWidth / 2;
              
              const isBezier = to.branchLineStyle === 'bezier';

              const lineProps = {
                points: [p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y],
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                bezier: isBezier,
                lineCap: 'round' as const,
                lineJoin: 'round' as const,
              };

              if (to.branchLineEnd === 'arrow') {
                return <Arrow {...lineProps} key={edge.id} pointerLength={8} pointerWidth={6} fill={strokeColor} />;
              }
              return <Line {...lineProps} key={edge.id} />;
            })}
            
            {visibleNodes.map((node) => {
              const style = computedNodeStyles.get(node.id);
              if (!style) return null;

              const { w, h, textToRender, finalFontSize } = getNodeBox(style);
              const isSelected = node.id === selectedNodeId;
              const isDropTarget = node.id === dropTargetId; 
              const isHovered = node.id === hoveredNodeId;
              const hasChildren = nodesWithChildren.has(node.id);
              
              const shapeProps = {
                width: w, height: h, offsetX: w / 2, offsetY: h / 2,
                fill: style.color,
                stroke: isDropTarget ? "#34d399" : (isSelected ? "#3b82f6" : style.borderColor),
                strokeWidth: isDropTarget ? 4 : (isSelected ? 3 : style.borderWidth),
                dash: style.borderStyle === 'dashed' ? [8, 4] : (style.borderStyle === 'dotted' ? [2, 3] : undefined),
                cornerRadius: style.shape === 'roundedRect' ? 8 : 0,
              };

              return (
                <Group
                  key={node.id} id={node.id} x={node.x} y={node.y} draggable
                  onDragStart={() => handleDragStart(node.id)}
                  onDragMove={(e) => handleDragMove(e, node.id)} 
                  onDragEnd={(e) => handleDragEnd(e, node.id)} 
                  onClick={(e) => { e.cancelBubble = true; setSelectedNodeId(node.id); }}
                  onDblClick={(e) => { e.cancelBubble = true; startEditing(node.id); }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {style.shape === 'circle' && <Circle {...shapeProps} radius={w / 2} />}
                  {style.shape === 'diamond' && (
                    <Path 
                      {...shapeProps}
                      data={`M${w/2} 0 L${w} ${h/2} L${w/2} ${h} L0 ${h/2} Z`}
                      offsetX={w/2}
                      offsetY={h/2}
                    />
                  )}
                  {(style.shape === 'rectangle' || style.shape === 'roundedRect') && <Rect {...shapeProps} />}
                  
                  <Text
                    visible={editingNodeId !== node.id}
                    // SỬA: Lỗi text
                    text={textToRender || (node.id === 'root' ? 'Chủ đề chính' : '(chưa có nội dung)')}
                    width={w} height={h} offsetX={w / 2} offsetY={h / 2}
                    align={style.textAlign}
                    verticalAlign="middle" 
                    fill={style.textColor} // SỬA: Dùng textColor
                    padding={PADDING_Y} listening={false}
                    fontSize={finalFontSize}
                    fontStyle={style.fontStyle === 'italic' ? 'italic' : (style.fontWeight === 'bold' ? 'bold' : 'normal')}
                    fontFamily={style.fontFamily}
                    textDecoration={style.textDecoration === 'none' ? undefined : style.textDecoration}
                    lineHeight={1.3}
                  />
                  
                  {isHovered && hasChildren && (
                    <Group
                      // SỬA: Vị trí nút Collapse cho Org Chart
                      x={globalStructure === 'org' ? 0 : (style.side === 'left' ? -w/2 : w / 2)}
                      y={globalStructure === 'org' ? h/2 : 0}
                      onClick={(e) => handleToggleCollapse(e, node.id)}
                      onMouseEnter={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'default';
                      }}
                    >
                      <Circle radius={8} fill="#3b82f6" stroke="#FFFFFF" strokeWidth={2} />
                      {node.collapsed ? (
                        <Text
                          text={`${descendantCounts.get(node.id) || 0}`}
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
              // SỬA: Chạy AutoLayout
              setTimeout(() => runAutoLayout(), 50);
            }}
            onSetBackgroundColor={setBackgroundColor}
            onSetGlobalFont={(font) => setGlobalStore({ globalFont: font })}
            onSetBranchLineWidth={(width) => setGlobalStore({ branchLineWidth: width })}
            onToggleColoredBranch={(state) => setGlobalStore({ isColoredBranch: state })}
            onSetActiveColorTheme={(themeName) => {
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
  );
}


