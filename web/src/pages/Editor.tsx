import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Konva from 'konva';
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
import Relationship from '../features/editor/Relationship';
import Summary from '../features/editor/Summary';

import {
  BeMindmapContent,
  BeMindmapDoc,
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
} from '../services/dataMapper';

type BroadcastPatch = {
  type: string;
  payload: any; 
  senderId: string;
};
type BeGuestDoc = {
  id: string;
  name: string;
  content: BeMindmapContent;
};

const GUEST_BUCKET = 'mm_guest_docs';

const PADDING_X = 20,
  PADDING_Y = 12;
const LINE_HEIGHT_MULTIPLIER = 1.3;

const BRANCH_COLORS_PALETTE = [
  '#14B8A6', 
  '#3B82F6',
  '#10B981', 
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#F97316',
  '#6366F1', 
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
  feEdges: EdgeData[],
  feRelationships?: any[], 
  feSummaries?: any[] 
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
    // Include fontStyle and fontWeight for accurate text measurement
    const fontWeight = style.fontWeight || 'normal';
    const fontStyle = style.fontStyle || 'normal';
    context.font = `${fontStyle} ${fontWeight} ${finalFontSize}px ${style.fontFamily || 'Inter'}`;
  }
  const measureWidth = (text: string) =>
    context?.measureText(text).width || text.length * finalFontSize * 0.6;
  if (nodeLength === 'fit') {
    // Set a maximum width for 'fit' mode to enable text wrapping
    const maxFitWidth = node.id === 'root' ? 800 : 400; // Root can grow wider
    let maxWidth = 0;
    const lines = processedText.split('\n');
    
    // First pass: check if any line exceeds maxFitWidth
    lines.forEach((line: string) => {
      const lineWidth = measureWidth(line);
      if (lineWidth > maxFitWidth) {
        maxWidth = maxFitWidth;
      } else {
        maxWidth = Math.max(maxWidth, lineWidth);
      }
    });
    
    w = maxWidth + PADDING_X * 2 + borderWidth * 2;
    w = Math.max(w, 80);
    
    // Second pass: wrap lines that are too long
    const contentWidth = w - PADDING_X * 2 - borderWidth * 2;
    lines.forEach((line: string) => {
      if (line.length === 0) {
        wrappedLines.push('');
        return;
      }
      
      const lineWidth = measureWidth(line);
      if (lineWidth <= contentWidth) {
        wrappedLines.push(line);
      } else {
        // Wrap this line
        let currentLine = '';
        const words = line.split(' ');
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = measureWidth(testLine);
          if (testWidth > contentWidth) {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
            // Handle very long words
            while (measureWidth(currentLine) > contentWidth) {
              wrappedLines.push(currentLine.substring(0, 20));
              currentLine = currentLine.substring(20);
            }
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) wrappedLines.push(currentLine);
      }
    });
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

// const URLImage = ({ src, x, y, width, height, onImageLoad }: any) => {
//   const [image] = useImage(src);
//   
//   useEffect(() => {
//     if (image && onImageLoad) {
//       onImageLoad(image.width, image.height);
//     }
//   }, [image, onImageLoad]); 

//   if (!image) return null;
//   return <KonvaImage image={image} x={x} y={y} width={width} height={height} cornerRadius={4} />;
// };

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
    addRelationship,
    updateRelationship,
    updateRelationshipLabel,
    removeRelationship,
    addSummary,
    updateSummary,
    removeSummary,
    relationships,
    summaries,
  } = useEditorStore();

  const handleToggleBoundary = () => {
    if (selectedNodeIds.length === 1) {
      const targetId = selectedNodeIds[0];
      toggleNodeBoundary(targetId);
      // Re-run layout so boundary sizing/padding is updated immediately
      setTimeout(() => handleLayout(), 0);
    }
  };

  const [isRelationshipMode, setIsRelationshipMode] = useState(false);
  const [relationshipFrom, setRelationshipFrom] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [selectedBoundaryId, setSelectedBoundaryId] = useState<string | null>(null);

  const handleAddRelationship = () => {
    if (selectedNodeIds.length === 1) {
      setIsRelationshipMode(true);
      setRelationshipFrom(selectedNodeIds[0]);
    }
  };

  const handleAddSummary = () => {
    if (selectedNodeIds.length === 1) {
      const node = nodes.find(n => n.id === selectedNodeIds[0]);
      if (node && node.parentId) {
        addSummary(node.parentId, selectedNodeIds[0], selectedNodeIds[0], '');
        // Trigger layout để summary node được đặt đúng vị trí
        setTimeout(() => handleLayout(), 50);
      }
    }
  };

  const handleUpdateRelationshipControlPoints = (relationshipId: string, cp1: { x: number; y: number }, cp2: { x: number; y: number }) => {
    updateRelationship(relationshipId, { controlPoint1: cp1, controlPoint2: cp2 });
  };

  const handleUpdateRelationshipLabel = (relationshipId: string, label: string) => {
    updateRelationshipLabel(relationshipId, label);
  };

  const handleDeleteRelationship = (id: string) => {
    const relationship = relationships.find(r => r.id === id);
    if (!relationship) return;
    
    // Xóa label node nếu có
    if (relationship.labelNodeId) {
      const newNodes = nodes.filter(n => n.id !== relationship.labelNodeId);
      setGraph(newNodes, edges);
    }
    
    removeRelationship(id);
    setSelectedRelationshipId(null);
    debouncedPushHistory();
    debouncedPersistData();
  };

  const handleDeleteSummary = (id: string) => {
    removeSummary(id);
    setSelectedSummaryId(null);
    debouncedPushHistory();
    debouncedPersistData();
  };

  const handleDeleteBoundary = (nodeId: string) => {
    const newNodes = nodes.map(n => 
      n.id === nodeId ? { ...n, boundary: false } : n
    );
    setGraph(newNodes, edges);
    setSelectedBoundaryId(null);
    debouncedPushHistory();
    debouncedPersistData();
  };

  const handleUpdateSummaryRange = (summaryId: string, newStartNodeId: string, newEndNodeId: string) => {
    updateSummary(summaryId, { startNodeId: newStartNodeId, endNodeId: newEndNodeId });
    setTimeout(() => handleLayout(), 0); 
  };

  // State nội bộ - Lấy name từ store thay vì state local
  const name = useEditorStore(s => s.currentMindmapName);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isReadyToShow, setIsReadyToShow] = useState(false);
  const [isFormattingToolbarOpen, setFormattingToolbarOpen] = useState(false); // UI Mới
  const [presentationMode, setPresentationMode] = useState(false);
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
  const [dragStartState, setDragStartState] = useState<{
    nodes: NodeData[];
    edges: EdgeData[];
  } | null>(null);
  const draggedNodeChildrenRef = useRef<Set<string>>(new Set());
  const imposterRef = useRef<any>(null);
  const hiddenRealNodesRef = useRef<any[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);
  const [dropTargetSide, setDropTargetSide] = useState<'left' | 'right' | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#FAFAFB');
  const [styleClipboard, setStyleClipboard] = useState<Partial<NodeData> | null>(
    null
  );
  const [rootCollapse, setRootCollapse] = useState({ left: false, right: false });
  const lastEditStopTime = useRef(0);
  const pendingLayoutRef = useRef(false);

  const stageRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasContainerWidth, setCanvasContainerWidth] = useState<number>(0);
    useEffect(() => {
      const updateWidth = () => {
        if (canvasContainerRef.current) {
          setCanvasContainerWidth(canvasContainerRef.current.getBoundingClientRect().width);
        }
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }, [isFormattingToolbarOpen, dimensions.width]);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // [DOCKING SIDEBAR] Panel width constant - must be before useEffect that uses it
  const PANEL_WIDTH = 280;
  const prevPanelStateRef = useRef(isFormattingToolbarOpen);

  // Close FormattingToolbar when entering presentation mode
  useEffect(() => {
    if (presentationMode && isFormattingToolbarOpen) {
      setFormattingToolbarOpen(false);
    }
  }, [presentationMode]);

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
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach(e => {
      if (!map.has(e.from)) map.set(e.from, []);
      map.get(e.from)!.push(e.to);
    });
    return map;
  }, [edges]);
  
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
    
    // Helper: tính vị trí label từ bezier curve
    const getLabelPosition = (relationship: any, fromNode: NodeData, toNode: NodeData) => {
      // Tính điểm trên cạnh node
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const angle = Math.atan2(dy, dx);
      
      const fromVisual = map.get(fromNode.id);
      const toVisual = map.get(toNode.id);
      const fromBox = fromVisual ? calculateNodeBox(fromNode, fromVisual) : { w: 100, h: 40 };
      const toBox = toVisual ? calculateNodeBox(toNode, toVisual) : { w: 100, h: 40 };
      
      const p1 = { 
        x: fromNode.x + Math.cos(angle) * (fromBox.w / 2), 
        y: fromNode.y + Math.sin(angle) * (fromBox.h / 2) 
      };
      const p4 = { 
        x: toNode.x - Math.cos(angle) * (toBox.w / 2), 
        y: toNode.y - Math.sin(angle) * (toBox.h / 2) 
      };
      
      // Control points
      const cp1 = relationship.controlPoint1 || { 
        x: p1.x + (p4.x - p1.x) / 3, 
        y: p1.y 
      };
      const cp2 = relationship.controlPoint2 || { 
        x: p1.x + 2 * (p4.x - p1.x) / 3, 
        y: p4.y 
      };
      
      // Trung điểm của 4 điểm bezier
      return {
        x: (p1.x + cp1.x + cp2.x + p4.x) / 4,
        y: (p1.y + cp1.y + cp2.y + p4.y) / 4
      };
    };
    
    nodes.forEach((node) => {
      // Kiểm tra nếu là label node của relationship
      const isLabelNode = node.parentId?.startsWith('rel_');
      
      if (isLabelNode) {
        // Label node: tính vị trí từ relationship bezier curve
        const relationship = relationships.find(r => r.labelNodeId === node.id);
        if (relationship) {
          const fromNode = nodes.find(n => n.id === relationship.from);
          const toNode = nodes.find(n => n.id === relationship.to);
          
          if (fromNode && toNode) {
            const pos = getLabelPosition(relationship, fromNode, toNode);
            
            map.set(node.id, {
              ...node,
              x: pos.x,
              y: pos.y,
              fontSize: 11,
              fontWeight: 'normal',
            });
            return;
          }
        }
      }
      
      // Node bình thường
      const topo = nodeTopology.get(node.id);
      let style = getNodeComputedStyle(node, activeTheme, globalFont, topo);
      // [ORG STRUCTURE] Level 3+ vẫn là box, không underline
      const gs = useEditorStore.getState().globalStructure;
      if (gs === 'org' && topo && topo.depth >= 3) {
        if (style.color === 'transparent') {
          style = {
            ...style,
            color: activeTheme.quickStyles.default.fill || '#FFFFFF',
            borderColor: activeTheme.quickStyles.default.stroke || '#CBD5E0',
            textColor: style.textColor || '#333333',
            borderWidth: 1,
            shape: 'roundedRect',
          } as NodeData;
        }
      }
      map.set(node.id, style);
    });
    return map;
  }, [nodes, activeTheme, globalFont, nodeTopology, relationships]);

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
    const { nodes: currentNodes, edges: currentEdges, relationships, summaries } =
      useEditorStore.getState();

    if (isGuest) {
      saveGuestDoc(id, name, currentNodes, currentEdges, relationships, summaries);
    } else if (isAuthed) {
      const docToSave = {
        name,
        content: { nodes: currentNodes, edges: currentEdges, relationships, summaries },
      };
      console.log('[DEBUG] Saving data:', {
        nodesCount: currentNodes.length,
        edgesCount: currentEdges.length,
        relationshipsCount: relationships?.length || 0,
        summariesCount: summaries?.length || 0
      });
      mindmapsApi.update(id, docToSave).catch((e) => {
        console.error('Lưu trữ (persist) ngầm thất bại:', e);
        console.error('Error response:', e.response?.data);
      });
    }
  }, 5000, {
  });

  // [RESIZE OBSERVER] Update canvas dimensions accounting for panel width
  // [OPTIMIZATION] Debounce resize để tránh layout liên tục (theo spec: 100-200ms)
  useEffect(() => {
    let resizeTimer: number;
    
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const panelOffset = isFormattingToolbarOpen ? PANEL_WIDTH : 0;
        setDimensions({
          width: window.innerWidth - panelOffset,
          height: window.innerHeight - 48, 
        });
      }, 200); // Debounce 200ms
    };
    
    const panelOffset = isFormattingToolbarOpen ? PANEL_WIDTH : 0;
    setDimensions({
      width: window.innerWidth - panelOffset,
      height: window.innerHeight - 48,
    }); // Initial calculation (immediate)
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFormattingToolbarOpen]);

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
          useEditorStore.setState({ 
            currentMindmapId: id, 
            currentMindmapName: data.name, 
            isDirty: false,
            hasManuallyRenamedMindmap: false // Reset flag when loading new document
          });
          clearHistory();
          
          // [MỚI] Load relationships và summaries TRƯỚC setGraph để tránh bị ghi đè
          const relationships = data.relationships || [];
          const summaries = data.summaries || [];
          
          // [FIX] Tái tạo label nodes cho relationships nếu bị mất
          const loadedNodes = [...data.nodes];
          const loadedEdges = [...data.edges];
          
          relationships.forEach((rel: any) => {
            if (rel.labelNodeId) {
              // Kiểm tra xem label node có tồn tại không
              const existingLabelNode = loadedNodes.find(n => n.id === rel.labelNodeId);
              if (!existingLabelNode) {
                // Tái tạo label node
                const labelNode: NodeData = {
                  id: rel.labelNodeId,
                  parentId: rel.id,
                  nodeText: rel.label || 'relationship',
                  x: 0,
                  y: 0,
                  shape: 'roundedRect',
                  color: 'transparent',
                  borderColor: 'transparent',
                  borderWidth: 0,
                  fontSize: 11,
                  fontWeight: 'normal',
                  nodeLength: 'fit',
                };
                loadedNodes.push(labelNode);
              } else {
                // Đồng bộ label text từ relationship
                existingLabelNode.nodeText = rel.label || existingLabelNode.nodeText;
              }
            }
          });
          
          // [FIX] Tái tạo summary nodes nếu bị mất
          summaries.forEach((sum: any) => {
            if (sum.summaryNodeId) {
              const existingSummaryNode = loadedNodes.find(n => n.id === sum.summaryNodeId);
              if (!existingSummaryNode) {
                const summaryNode: NodeData = {
                  id: sum.summaryNodeId,
                  parentId: sum.id,
                  nodeText: sum.summaryText || 'Summary',
                  x: 0,
                  y: 0,
                  shape: 'roundedRect',
                  color: 'transparent',
                  borderColor: '#F59E0B',
                  borderWidth: 2,
                  fontSize: 12,
                  nodeLength: 150,
                  textColor: '#000000',
                };
                loadedNodes.push(summaryNode);
                
                // Tạo edge từ summary -> summary node
                const edgeExists = loadedEdges.some(e => e.from === sum.id && e.to === sum.summaryNodeId);
                if (!edgeExists) {
                  loadedEdges.push({
                    id: `e-${sum.summaryNodeId}`,
                    from: sum.id,
                    to: sum.summaryNodeId,
                  });
                }
              } else {
                // Đồng bộ summary text từ summaryData
                existingSummaryNode.nodeText = sum.summaryText || existingSummaryNode.nodeText;
                if (!existingSummaryNode.textColor) existingSummaryNode.textColor = '#000000';
              }
            }
          });
          
          // Set tất cả cùng lúc
          useEditorStore.setState({
            nodes: loadedNodes,
            edges: loadedEdges,
            relationships,
            summaries,
          });
          
          pushHistory(loadedNodes, loadedEdges);
          setGlobalStore({
            globalStructure: (data.layoutMode as GlobalStructure) || 'mindmap',
            globalFont: data.fontFamily || fonts[0].value,
            branchLineWidth: data.branchLineWidth || 2,
            globalBranchColor: data.globalBranchColor || '#14B8A6',
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
      // [FIX] Phải gửi đầy đủ nodes, edges, relationships, summaries
      const content = { 
        nodes: nodes, 
        edges,
        relationships: relationships || [],
        summaries: summaries || []
      };
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

  // [REMOVED] Auto open/close panel logic - now only controlled by toolbar button
  // useEffect(() => {
  //   if (selectedNodeIds.length > 0) {
  //      setFormattingToolbarOpen(true);
  //   } else {
  //      setFormattingToolbarOpen(false);
  //   }
  // }, [selectedNodeIds]);

  // [VIEWPORT RE-CENTERING] Smart re-centering when panel opens/closes
  useEffect(() => {
    const prevState = prevPanelStateRef.current;
    const currentState = isFormattingToolbarOpen;
    
    // Only re-center if state actually changed
    if (prevState !== currentState) {
      prevPanelStateRef.current = currentState;
      
      // Calculate delta shift
      const deltaX = currentState ? -(PANEL_WIDTH / 2) : (PANEL_WIDTH / 2);
      
      // Get anchor point (selected node or viewport center)
      let anchorX = 0;
      let anchorY = 0;
      
      if (selectedNodeIds.length > 0) {
        // Use selected node as anchor
        const firstNode = nodes.find(n => n.id === selectedNodeIds[0]);
        if (firstNode) {
          anchorX = firstNode.x;
          anchorY = firstNode.y;
        }
      } else {
        // Use current viewport center as anchor
        anchorX = (dimensions.width / 2 - pos.x) / scale;
        anchorY = (dimensions.height / 2 - pos.y) / scale;
      }
      
      // Apply smooth camera shift to keep anchor centered
      setPos(prevPos => ({
        x: prevPos.x + deltaX,
        y: prevPos.y
      }));
    }
  }, [isFormattingToolbarOpen, selectedNodeIds, dimensions, scale, pos, nodes]);

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

  // Add Ctrl+S shortcut for saving and Ctrl+A for select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          handleSave();
        }
      }
      
      // Ctrl+A: Select all nodes on canvas
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // Chỉ select nodes trong canvas, không select các element ngoài
        const allNodeIds = nodes.map(n => n.id);
        setSelectedNodeIds(allNodeIds);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, handleSave, nodes]);

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
                setTimeout(() => handleLayout(), 0);
                break;
              }
              case 'NODE_TEXT_CHANGE': {
                const { id: nodeId, text } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, nodeText: text } : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => handleLayout(), 0);
                break;
              }
              case 'NODE_CREATE': {
                const { node: feNode, edge: feEdge } = payload;
                setGraph([...currentNodes, feNode], [...currentEdges, feEdge]);
                setTimeout(() => handleLayout(), 0);
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
                setTimeout(() => handleLayout(), 0);
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
               setTimeout(() => handleLayout(), 0);
                break;
              }
              case 'NODE_STYLE_UPDATE': {
                const { id: nodeId, updates } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...updates } : n
                );
                setGraph(newNodes, currentEdges);
                if (updates.nodeLength) setTimeout(() => handleLayout(), 0);
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
                setTimeout(() => handleLayout(), 0);
                break;
              }
              case 'NODE_STYLE_PASTE': {
               const { id: nodeId, style } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...style } : n
                );
                setGraph(newNodes, currentEdges);
               setTimeout(() => handleLayout(), 0);
                break;
              }
              case 'NODE_STYLE_RESET': {
                const { id: nodeId, resetStyle } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...resetStyle } : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => handleLayout(), 0);
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
    () => {
      const stack = new Error().stack;
      const caller = stack?.split('\n')[2]?.trim() || 'unknown';
      console.log(`[Layout] Called from: ${caller}`);
      
      const { globalStructure, nodes, edges } = useEditorStore.getState();
      const layoutType = globalStructure;

      let newNodes: NodeData[] = [...nodes];

      if (layoutType === 'mindmap' || layoutType === 'logic') {
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
          
          // [SUPER-NODE] Tính boundary padding nếu node có boundary
          let boundaryPaddingVertical = 0;
          if (node.boundary) {
            // Padding cho boundary: base 30px, giảm theo depth
            const depth = (() => {
              let d = 0;
              let parentId = node.parentId;
              while (parentId) {
                const parent = nodes.find(n => n.id === parentId);
                if (parent?.boundary) d++;
                parentId = parent?.parentId;
              }
              return d;
            })();
            const basePadding = 30;
            const depthPadding = depth * -8;
            const padding = Math.max(10, basePadding + depthPadding);
            boundaryPaddingVertical = padding * 2; // Top + Bottom
          }
          
          if (node.children.length === 0) {
            node.subtreeHeight = selfHeight + boundaryPaddingVertical;
            return node.subtreeHeight;
          }
          let childrenTotalHeight = 0;
          node.children.forEach((child, index) => {
            childrenTotalHeight += calculateSubtreeHeights(child);
            if (index > 0) {
              childrenTotalHeight += VERTICAL_GAP;
            }
          });
          node.subtreeHeight = Math.max(selfHeight, childrenTotalHeight) + boundaryPaddingVertical;
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
            let nodeWidth = nodeVisual?.box.w || 150;
            
            // [SUPER-NODE] Expand width if node has boundary
            if (node.boundary) {
              const depth = (() => {
                let d = 0;
                let parentId = node.parentId;
                while (parentId) {
                  const parent = nodes.find(n => n.id === parentId);
                  if (parent?.boundary) d++;
                  parentId = parent?.parentId;
                }
                return d;
              })();
              const basePadding = 30;
              const depthPadding = depth * -8;
              const padding = Math.max(10, basePadding + depthPadding);
              nodeWidth += padding * 2; // Left + Right padding
            }
            
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
            let nodeWidth = nodeVisual?.box.w || 150;
            
            // [SUPER-NODE] Expand width if node has boundary
            if (node.boundary) {
              const depth = (() => {
                let d = 0;
                let parentId = node.parentId;
                while (parentId) {
                  const parent = nodes.find(n => n.id === parentId);
                  if (parent?.boundary) d++;
                  parentId = parent?.parentId;
                }
                return d;
              })();
              const basePadding = 30;
              const depthPadding = depth * -8;
              const padding = Math.max(10, basePadding + depthPadding);
              nodeWidth += padding * 2;
            }
            
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
          let rightGroup: TreeNode[] = [];
          let leftGroup: TreeNode[] = [];
            if (layoutType === 'logic') {
              // Force all root children to the RIGHT for logic structure
              rootNode.children.forEach((child) => { child.side = 'right'; });
              rightGroup = rootNode.children;
              leftGroup = [];
            } else {
              // [STICKY STATE] Do NOT rebalance existing root children.
              // Respect each child's existing side. Only assign side for children without a side.
              const existingLeft: TreeNode[] = [];
              const existingRight: TreeNode[] = [];
              const unassigned: TreeNode[] = [];
              rootNode.children.forEach((child) => {
                if (child.side === 'left') existingLeft.push(child);
                else if (child.side === 'right') existingRight.push(child);
                else unassigned.push(child);
              });

              // For unassigned children (rare), use water-filling to decide side without moving existing ones
              const sortedUnassigned = [...unassigned].sort((a, b) => b.subtreeHeight - a.subtreeHeight);
              let leftAccum = existingLeft.reduce((sum, c, idx) => sum + c.subtreeHeight + (idx > 0 ? VERTICAL_GAP : 0), 0);
              let rightAccum = existingRight.reduce((sum, c, idx) => sum + c.subtreeHeight + (idx > 0 ? VERTICAL_GAP : 0), 0);
              sortedUnassigned.forEach((child) => {
                const h = child.subtreeHeight;
                if (rightAccum <= leftAccum) {
                  child.side = 'right';
                  existingRight.push(child);
                  rightAccum += h + (existingRight.length > 1 ? VERTICAL_GAP : 0);
                } else {
                  child.side = 'left';
                  existingLeft.push(child);
                  leftAccum += h + (existingLeft.length > 1 ? VERTICAL_GAP : 0);
                }
              });

              // Use the sticky groups for positioning
              rightGroup = existingRight;
              leftGroup = existingLeft;
            }
          positionBranch(rightGroup, rootNode, 'right');
          positionBranch(leftGroup, rootNode, 'left');
          newNodes = Array.from(treeMap.values()).map((node) => {
            const { children, subtreeHeight, ...rest } = node;
            return rest;
          });
        }
      } else {
        // Dagre layout cho 'org' (chỉ org)
        const g = new dagre.graphlib.Graph();
        const rankdir = 'TB';
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
          {
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
          const side = 'right';
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

      // Position summary nodes at brace tip positions
      const { summaries } = useEditorStore.getState();

      type SummaryLayout = {
        summary: typeof summaries[number];
        firstNodeSide: 'left' | 'right';
        direction: -1 | 1;
        startX: number;
        midY: number;
        xMid: number;
        spanHeight: number;
      };

      const layouts: SummaryLayout[] = [];

      summaries.forEach(summary => {
        if (!summary.summaryNodeId) return;
        const parentNode = newNodes.find(n => n.id === summary.parentId);
        if (!parentNode) return;
        
        const siblings = newNodes.filter(n => n.parentId === summary.parentId);
        const startIdx = siblings.findIndex(n => n.id === summary.startNodeId);
        const endIdx = siblings.findIndex(n => n.id === summary.endNodeId);
        if (startIdx === -1 || endIdx === -1) return;
        
        const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        
        // Collect leaf nodes
        const collectLeafNodes = (nodeId: string): string[] => {
          const node = newNodes.find(n => n.id === nodeId);
          if (node?.collapsed) return [nodeId];
          const children = newNodes.filter(n => n.parentId === nodeId);
          if (children.length === 0) return [nodeId];
          return children.flatMap(child => collectLeafNodes(child.id));
        };
        
        const leafNodes: string[] = [];
        for (let i = minIdx; i <= maxIdx; i++) {
          leafNodes.push(...collectLeafNodes(siblings[i].id));
        }
        
        // Calculate brace position
        const firstNode = newNodes.find(n => n.id === summary.startNodeId);
        if (!firstNode) return;
        
        const isLeft = firstNode.side === 'left';
        const direction = isLeft ? -1 : 1;
        
        let braceX = isLeft ? Infinity : -Infinity;
        let startY = Infinity;
        let endY = -Infinity;
        
        leafNodes.forEach(leafId => {
          const node = newNodes.find(n => n.id === leafId);
          const visual = nodeVisuals.get(leafId);
          if (node && visual) {
            const nodeLeft = node.x - visual.box.w / 2;
            const nodeRight = node.x + visual.box.w / 2;
            const nodeTop = node.y - visual.box.h / 2;
            const nodeBottom = node.y + visual.box.h / 2;
            braceX = isLeft ? Math.min(braceX, nodeLeft) : Math.max(braceX, nodeRight);
            startY = Math.min(startY, nodeTop);
            endY = Math.max(endY, nodeBottom);
          }
        });
        
        const braceWidth = 15;
        const startX = isLeft ? braceX - 20 : braceX + 20;
        const midY = (startY + endY) / 2;
        const xMid = startX + (braceWidth * direction * 1.5);
        const spanHeight = endY - startY;

        layouts.push({
          summary,
          firstNodeSide: (firstNode.side as 'left' | 'right') || 'right',
          direction: direction as -1 | 1,
          startX,
          midY,
          xMid,
          spanHeight,
        });
      });

      const grouped = new Map<string, SummaryLayout[]>();
      layouts.forEach(l => {
        const key = `${l.summary.parentId}-${l.firstNodeSide}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(l);
      });

      const outwardBase = 80;
      const outwardStep = 28;

      grouped.forEach(group => {
        group.sort((a, b) => b.spanHeight - a.spanHeight); // outer first
        group.forEach((layout, idx) => {
          const level = group.length - idx - 1; // inner summaries get smaller offset
          const { summary, direction, xMid, midY, firstNodeSide } = layout;
          const summaryNodeIndex = newNodes.findIndex(n => n.id === summary.summaryNodeId);
          if (summaryNodeIndex !== -1) {
            newNodes[summaryNodeIndex] = {
             ...newNodes[summaryNodeIndex],
              x: xMid + (direction * (outwardBase + level * outwardStep)),
              y: midY, // keep aligned to brace, avoid vertical drift/overlap
              side: firstNodeSide,
            };
          }
        });
      });

      // Lấy trạng thái hiện tại của nodes từ store
      const currentNodesInStore = useEditorStore.getState().nodes;

      // Chỉ cập nhật graph nếu có sự thay đổi đáng kể về vị trí/kích thước
      if (!deepEqualNodes(newNodes, currentNodesInStore)) {
        setGraph(newNodes, edges);
      }
      
      setRootCollapse({ left: false, right: false });
    },
    [nodeVisuals, setGraph, edges] 
  );

  

  // ============================================================================
  // Rebalance Layout - Chia đều tất cả node con về 2 bên
  // ============================================================================
  const handleRebalanceLayout = useCallback(() => {
    console.log('[Rebalance] Starting full tree rebalance');
    
    const { globalStructure, nodes, edges } = useEditorStore.getState();
    
    // Chỉ hoạt động với mindmap structure
    if (globalStructure !== 'mindmap') {
      console.log('[Rebalance] Only works with mindmap structure');
      return;
    }

    let newNodes: NodeData[] = [...nodes];
    
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
      
      let boundaryPaddingVertical = 0;
      if (node.boundary) {
        const depth = (() => {
          let d = 0;
          let parentId = node.parentId;
          while (parentId) {
            const parent = nodes.find(n => n.id === parentId);
            if (parent?.boundary) d++;
            parentId = parent?.parentId;
          }
          return d;
        })();
        const basePadding = 30;
        const depthPadding = depth * -8;
        const padding = Math.max(10, basePadding + depthPadding);
        boundaryPaddingVertical = padding * 2;
      }
      
      if (node.children.length === 0) {
        node.subtreeHeight = selfHeight + boundaryPaddingVertical;
        return node.subtreeHeight;
      }
      
      let childrenTotalHeight = 0;
      node.children.forEach((child, index) => {
        childrenTotalHeight += calculateSubtreeHeights(child);
        if (index > 0) {
          childrenTotalHeight += VERTICAL_GAP;
        }
      });
      node.subtreeHeight = Math.max(selfHeight, childrenTotalHeight) + boundaryPaddingVertical;
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
        let nodeWidth = nodeVisual?.box.w || 150;
        
        if (node.boundary) {
          const depth = (() => {
            let d = 0;
            let parentId = node.parentId;
            while (parentId) {
              const parent = nodes.find(n => n.id === parentId);
              if (parent?.boundary) d++;
              parentId = parent?.parentId;
            }
            return d;
          })();
          const basePadding = 30;
          const depthPadding = depth * -8;
          const padding = Math.max(10, basePadding + depthPadding);
          nodeWidth += padding * 2;
        }
        
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
        let nodeWidth = nodeVisual?.box.w || 150;
        
        if (node.boundary) {
          const depth = (() => {
            let d = 0;
            let parentId = node.parentId;
            while (parentId) {
              const parent = nodes.find(n => n.id === parentId);
              if (parent?.boundary) d++;
              parentId = parent?.parentId;
            }
            return d;
          })();
          const basePadding = 30;
          const depthPadding = depth * -8;
          const padding = Math.max(10, basePadding + depthPadding);
          nodeWidth += padding * 2;
        }
        
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
      
      // [REBALANCE MODE] Không giữ side cũ - chia đều tất cả children
      const sortedChildren = [...rootNode.children].sort((a, b) => b.subtreeHeight - a.subtreeHeight);
      
      let rightGroup: TreeNode[] = [];
      let leftGroup: TreeNode[] = [];
      let leftAccum = 0;
      let rightAccum = 0;
      
      sortedChildren.forEach((child) => {
        const h = child.subtreeHeight;
        if (rightAccum <= leftAccum) {
          child.side = 'right';
          rightGroup.push(child);
          rightAccum += h + (rightGroup.length > 1 ? VERTICAL_GAP : 0);
        } else {
          child.side = 'left';
          leftGroup.push(child);
          leftAccum += h + (leftGroup.length > 1 ? VERTICAL_GAP : 0);
        }
      });
      
      positionBranch(rightGroup, rootNode, 'right');
      positionBranch(leftGroup, rootNode, 'left');
      
      newNodes = Array.from(treeMap.values()).map((node) => {
        const { children, subtreeHeight, ...rest } = node;
        return rest;
      });
    }
    
    setGraph(newNodes, edges);
    console.log('[Rebalance] Completed');
  }, [nodeVisuals, edges, setGraph]);

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

  // ================================================
  // New Node Animation (Spring Physics - Xmind style)
  // ================================================
  const fadingInRef = useRef<Set<string>>(new Set());
  const startNodeBirthAnimation = useCallback((nodeId: string, parentX: number, parentY: number, finalX: number, finalY: number) => {
    const stage = stageRef.current?.getStage();
    if (!stage) return;
    try {
      const group = stage.findOne(`#${nodeId}`) as any;
      if (!group) return;
      
      fadingInRef.current.add(nodeId);
      
      // Initial state: at parent position, small scale, transparent
      group.x(parentX);
      group.y(parentY);
      group.scaleX(0.5);
      group.scaleY(0.5);
      group.opacity(0);
      
      // Spring animation: position + scale + opacity
      const tween = new (window as any).Konva.Tween({
        node: group,
        x: finalX,
        y: finalY,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.25, // 250ms for smooth spring feel
        easing: (window as any).Konva?.Easings?.EaseOut || undefined,
        onFinish: () => {
          fadingInRef.current.delete(nodeId);
        },
      });
      tween.play();
    } catch (e) {
      fadingInRef.current.delete(nodeId);
    }
  }, []);

  // ==========================================================
  // Render Tracking (diagnose number of renders per action)
  // ==========================================================
  const renderTrackRef = useRef<{ active: boolean; id: number; start: number; count: number; label: string }>(
    { active: false, id: 0, start: 0, count: 0, label: '' }
  );
  // Increment render count on every render when tracking is active
  if (renderTrackRef.current.active) {
    renderTrackRef.current.count++;
  }
  const startRenderTracking = useCallback((label: string) => {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const id = Date.now();
    if (renderTrackRef.current.active) {
      // Overlapping sessions should not happen, but guard just in case
      // End previous session and log it
      const prev = renderTrackRef.current;
      const prevDuration = Math.round(now - prev.start);
      console.warn(`[RenderTrack] FORCE-END ${prev.label} id=${prev.id} renders=${prev.count} duration=${prevDuration}ms`);
    }
    renderTrackRef.current = { active: true, id, start: now, count: 0, label };
    console.log(`[RenderTrack] START ${label} id=${id}`);
  }, []);
  const endRenderTracking = useCallback(() => {
    if (!renderTrackRef.current.active) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const sess = renderTrackRef.current;
    const duration = Math.round(now - sess.start);
    console.log(`[RenderTrack] END ${sess.label} id=${sess.id} renders=${sess.count} duration=${duration}ms`);
    renderTrackRef.current.active = false;
  }, []);

const handleFitToScreen = useCallback(() => {
  console.log('[FitToScreen] Called - Fitting camera to view all nodes');
  
  // Gọi layout để tính toán vị trí
  handleLayout();
  
  // Sau đó thực hiện fit camera
  const { nodes } = useEditorStore.getState();
  if (nodes.length === 0) return;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach((node) => {
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
  
  const panelOffset = isFormattingToolbarOpen ? PANEL_WIDTH : 0;
  const currentWidth = window.innerWidth - panelOffset;
  const currentHeight = window.innerHeight - 48;
  
  if (boundsWidth <= 0 || boundsHeight <= 0) {
    setScale(1);
    setPos({ x: currentWidth / 2 - nodes[0].x, y: currentHeight / 2 - nodes[0].y });
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
}, [handleLayout, nodeVisuals, isFormattingToolbarOpen, PANEL_WIDTH]); 

  // [AUTO-PAN] Ensure node is visible in viewport (not hidden behind panel)


  const startEditing = useCallback((nodeId: string) => {
    setSelectedNodeIds([nodeId]);
    setEditingNodeId(nodeId);
    // Giữ camera cố định theo yêu cầu
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
      console.log('[Layout] Triggered by stopEditing useEffect');
      handleLayout(); 
    }, 0);
  }, [isDataLoaded, handleLayout]);



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
        
        // Auto-update mindmap name from root node if user hasn't manually renamed
        if (editingNodeId === 'root' && !useEditorStore.getState().hasManuallyRenamedMindmap) {
          const rootText = newText.trim();
          if (rootText) {
            // Take first line or first 50 characters as name
            const firstLine = rootText.split('\n')[0];
            const newName = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
            useEditorStore.setState({ currentMindmapName: newName });
            
            // Update in toolbar's local items list
            const mindmapItems = useMindmapsStore.getState().items;
            const currentId = useEditorStore.getState().currentMindmapId;
            if (currentId) {
              const newItems = mindmapItems.map(item => 
                item.id === currentId ? { ...item, name: newName } : item
              );
              useMindmapsStore.setState({ items: newItems });
            }
          }
        }
        
        // [OPTIMIZATION] Layout sẽ tự động trigger khi nodeVisuals thay đổi
        // Không cần trigger thủ công ở đây vì text change sẽ update nodeVisuals
        // và handleLayout đã có dependency vào nodeVisuals
        
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
    // Track renders for this action
    startRenderTracking('addChild');
    const parentNode = nodeMap.get(parentId); 
    const parentVisual = nodeVisuals.get(parentId); 
    if (!parentNode || !parentVisual) return;

    // Nếu cha đang collapsed thì mở nhánh ra
    let updatedNodes = nodes;
    if (parentNode.collapsed) {
      updatedNodes = nodes.map(n => n.id === parentId ? { ...n, collapsed: false } : n);
    }

    const parentComputedStyle = parentVisual.style; 

    const newId = "n" + Date.now();
    
    // [WATER FILLING ALGORITHM] - Predictive Placement cho root children
    let determinedSide = parentComputedStyle.side;
    
    if (useEditorStore.getState().globalStructure === 'logic') {
      // Always add to the right in logic structure
      determinedSide = 'right';
    } else if (parentId === 'root') {
      // Tính tổng chiều cao thực tế của mỗi bên
      const rootChildren = edges.filter(e => e.from === 'root').map(e => e.to);
      let leftHeight = 0;
      let rightHeight = 0;
      
      rootChildren.forEach(childId => {
        const childNode = nodeMap.get(childId);
        const childVisual = nodeVisuals.get(childId);
        if (!childNode || !childVisual) return;
        
        const childHeight = childVisual.box.h;
        if (childNode.side === 'left') {
          leftHeight += childHeight;
        } else {
          rightHeight += childHeight;
        }
      });
      
      // Water Filling: Chọn bên thấp hơn
      determinedSide = leftHeight <= rightHeight ? 'left' : 'right';
    }

    // Pre-calc final position (Predictive Placement)
    const HORIZONTAL_GAP = 120;
    const VERTICAL_GAP = 20;
    const DEFAULT_NODE_HEIGHT = 60;
    const DEFAULT_NODE_WIDTH = 150;

    let calculatedX = parentComputedStyle.x;
    let calculatedY = parentComputedStyle.y;

    const siblings = nodes.filter(n => n.parentId === parentId);
    const getSubtreeHeight = (nodeId: string): number => {
      const visual = nodeVisuals.get(nodeId);
      if (!visual) return DEFAULT_NODE_HEIGHT;
      const node = nodeMap.get(nodeId);
      if (!node) return visual.box.h;
      const children = nodes.filter(n => n.parentId === nodeId);
      if (children.length === 0 || node.collapsed) return visual.box.h;
      let childrenTotalHeight = 0;
      children.forEach((child, index) => {
        childrenTotalHeight += getSubtreeHeight(child.id);
        if (index > 0) childrenTotalHeight += VERTICAL_GAP;
      });
      return Math.max(visual.box.h, childrenTotalHeight);
    };

    if (siblings.length > 0) {
      const direction = (useEditorStore.getState().globalStructure === 'logic') ? 1 : (determinedSide === 'left' ? -1 : 1);
      const parentWidth = parentVisual.box.w;
      let totalHeight = 0;
      siblings.forEach((sibling, index) => {
        totalHeight += getSubtreeHeight(sibling.id);
        if (index > 0) totalHeight += VERTICAL_GAP;
      });
      totalHeight += DEFAULT_NODE_HEIGHT + VERTICAL_GAP;
      calculatedX = parentComputedStyle.x + direction * (HORIZONTAL_GAP / 1.5 + parentWidth / 2 + DEFAULT_NODE_WIDTH / 2);
      let currentY = parentComputedStyle.y - totalHeight / 2;
      siblings.forEach((sibling, index) => {
        const siblingSubtreeHeight = getSubtreeHeight(sibling.id);
        currentY += siblingSubtreeHeight;
        if (index < siblings.length - 1 || siblings.length > 0) currentY += VERTICAL_GAP;
      });
      calculatedY = currentY + DEFAULT_NODE_HEIGHT / 2;
    } else {
      const direction = (useEditorStore.getState().globalStructure === 'logic') ? 1 : (determinedSide === 'left' ? -1 : 1);
      const parentWidth = parentVisual.box.w;
      calculatedX = parentComputedStyle.x + direction * (HORIZONTAL_GAP / 1.5 + parentWidth / 2 + DEFAULT_NODE_WIDTH / 2);
      calculatedY = parentComputedStyle.y;
    }

    const newNodeData: NodeData = { 
      id: newId, 
      nodeText: "Nội dung",
      x: calculatedX,
      y: calculatedY,
      parentId,
      side: (useEditorStore.getState().globalStructure === 'logic') ? 'right' : determinedSide,
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
    
    const newNodes = [...updatedNodes, newNodeData];
    const newEdges = [...edges, newEdgeData];

    pushHistory(nodes, edges);
    setGraph(newNodes, newEdges);
    
    // [FIX YÊU CẦU 1] Call layout immediately to get correct position, then animate
    // Smart viewport: ensure new node is visible without full fit-to-screen
    setTimeout(() => {
      handleLayout();
      setTimeout(() => {
        const finalVisual = nodeVisuals.get(newId);
        if (finalVisual) {
          startNodeBirthAnimation(newId, parentComputedStyle.x, parentComputedStyle.y, finalVisual.style.x, finalVisual.style.y);
        }
      }, 0);
      startEditing(newId);
      // Smart pan: only adjust camera if node is outside viewport or behind panel
      setTimeout(() => {
        // ensureNodeVisible removed
      }, 100);
      endRenderTracking();
    }, 0);
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout, startNodeBirthAnimation]);

  const handleAddSibling = useCallback((nodeId: string) => {
    // Track renders for this action
    startRenderTracking('addSibling');
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

    // Pre-calc final position for sibling (Predictive Placement)
    const HORIZONTAL_GAP = 120;
    const VERTICAL_GAP = 20;
    const DEFAULT_NODE_HEIGHT = 60;
    const DEFAULT_NODE_WIDTH = 150;
    let calculatedX = parentVisual.style.x;
    let calculatedY = parentVisual.style.y;
    const allSiblings = nodes.filter(n => n.parentId === parentId);
    const getSubtreeHeight = (nodeId: string): number => {
      const visual = nodeVisuals.get(nodeId);
      if (!visual) return DEFAULT_NODE_HEIGHT;
      const node = nodeMap.get(nodeId);
      if (!node) return visual.box.h;
      const children = nodes.filter(n => n.parentId === nodeId);
      if (children.length === 0 || node.collapsed) return visual.box.h;
      let childrenTotalHeight = 0;
      children.forEach((child, index) => {
        childrenTotalHeight += getSubtreeHeight(child.id);
        if (index > 0) childrenTotalHeight += VERTICAL_GAP;
      });
      return Math.max(visual.box.h, childrenTotalHeight);
    };
    if (allSiblings.length > 0) {
      const direction = (useEditorStore.getState().globalStructure === 'logic') ? 1 : (siblingNode.side === 'left' ? -1 : 1);
      const parentWidth = parentVisual.box.w;
      let totalHeight = 0;
      allSiblings.forEach((sibling, index) => {
        totalHeight += getSubtreeHeight(sibling.id);
        if (index > 0) totalHeight += VERTICAL_GAP;
      });
      totalHeight += DEFAULT_NODE_HEIGHT + VERTICAL_GAP;
      calculatedX = parentVisual.style.x + direction * (HORIZONTAL_GAP / 1.5 + parentWidth / 2 + DEFAULT_NODE_WIDTH / 2);
      let currentY = parentVisual.style.y - totalHeight / 2;
      allSiblings.forEach((sibling, index) => {
        const siblingSubtreeHeight = getSubtreeHeight(sibling.id);
        currentY += siblingSubtreeHeight;
        if (index < allSiblings.length - 1 || allSiblings.length > 0) currentY += VERTICAL_GAP;
      });
      calculatedY = currentY + DEFAULT_NODE_HEIGHT / 2;
    }

    const newNodeData: NodeData = { 
      id: newId, 
      nodeText: "Nội dung",
      x: calculatedX, 
      y: calculatedY, 
      parentId: parentId, 
      side: (useEditorStore.getState().globalStructure === 'logic') ? 'right' : siblingNode.side,
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
    
    // [FIX YÊU CẦU 1] Call layout immediately to get correct position, then animate
    // Smart viewport: ensure new node is visible without full fit-to-screen
    setTimeout(() => {
      handleLayout();
      setTimeout(() => {
        const finalVisual = nodeVisuals.get(newId);
        if (finalVisual) {
          startNodeBirthAnimation(newId, parentVisual.style.x, parentVisual.style.y, finalVisual.style.x, finalVisual.style.y);
        }
      }, 0);
      startEditing(newId);
      // Smart pan: only adjust camera if node is outside viewport or behind panel
      setTimeout(() => {
        // ensureNodeVisible removed
      }, 100);
      endRenderTracking();
    }, 0);
    
  }, [nodes, edges, pushHistory, setGraph, nodeMap, nodeVisuals, startEditing, handleLayout, handleAddChild, startNodeBirthAnimation]);

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
      setTimeout(() => handleLayout(), 50);
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
    
    // [OPTIMIZATION] Dirty Checking - chỉ layout khi có thay đổi dimension
    // Theo spec: fontSize, padding, borderWidth, nodeLength ảnh hưởng đến kích thước
    const needsLayout = updates.nodeLength !== undefined || 
                        updates.fontSize !== undefined || 
                        updates.borderWidth !== undefined;
    
    if (needsLayout) {
      setTimeout(() => handleLayout(), 50);
    }
    
    debouncedPushHistory();
    
    // Lưu ngay lập tức khi thay đổi style node
    if (id) {
      if (isGuest) {
        const { relationships, summaries } = useEditorStore.getState();
        saveGuestDoc(id, name, newNodes, edges, relationships, summaries);
      } else if (isAuthed) {
        const { relationships, summaries } = useEditorStore.getState();
        const docToSave = { name, content: { nodes: newNodes, edges, relationships, summaries } };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu style node thất bại:', e);
        });
      }
    }
    
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

      // Handle Delete for relationship, summary, or boundary
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        
        // [FIX] Ưu tiên xóa boundary nếu đang chọn boundary
        if (selectedBoundaryId) {
          handleDeleteBoundary(selectedBoundaryId);
          return;
        }
        
        if (selectedRelationshipId) {
          handleDeleteRelationship(selectedRelationshipId);
          return;
        }
        
        if (selectedSummaryId) {
          handleDeleteSummary(selectedSummaryId);
          return;
        }
        
        // Check if any selected node has boundary to delete
        if (selectedNodeIds.length === 1) {
          const node = nodes.find(n => n.id === selectedNodeIds[0]);
          if (node?.boundary) {
            // If boundary is selected, just remove boundary, don't delete node
            handleDeleteBoundary(node.id);
            return;
          }
        }
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
      editingNodeId, selectedNodeIds, selectedBoundaryId, 
      selectedRelationshipId, selectedSummaryId,
      handleAddChild, handleAddSibling, handleDeleteNode, 
      handleDeleteBoundary, handleDeleteRelationship, handleDeleteSummary,
      undo, redo, startEditing, nodes,
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
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
    setDragStartState({ nodes, edges });
    setDraggingNodeId(nodeId);
    
    const stage = stageRef.current;
    const layer = stage?.getLayers()[0];
    if (!stage || !layer) return;

    const node = stage.findOne(`#${nodeId}`);
    if (node && editingNodeId === nodeId) {
      node.stopDrag();
      return;
    }

    // Thu thập tất cả node con (đệ quy)
    const collectChildren = (id: string): string[] => {
      const children = adjacencyMap.get(id) || [];
      const allChildren = [...children];
      children.forEach(childId => {
        allChildren.push(...collectChildren(childId));
      });
      return allChildren;
    };

    const childIds = collectChildren(nodeId);
    
    const nodesToHide: any[] = [];
    const edgeClones: any[] = [];
    const nodeClones: any[] = [];

    // --- A. CLONE NODE CHA (để tạo "cái xác" nằm lại vị trí cũ) ---
    const rootNodeShape = stage.findOne(`#${nodeId}`);
    if (rootNodeShape) {
      const rootClone = rootNodeShape.clone();
      rootClone.draggable(false);
      rootClone.opacity(1); // Giữ nguyên độ đậm trong cache
      nodeClones.push(rootClone);
      // KHÔNG ẩn rootNodeShape thật - để kéo nó đi
    }

    // --- B. CLONE CON CHÁU & DÂY ---
    const childIdSet = new Set([nodeId, ...childIds]);
    
    // Clone các node con
    childIds.forEach(childId => {
      const childNode = stage.findOne(`#${childId}`);
      if (childNode) {
        const clone = childNode.clone();
        clone.draggable(false);
        nodeClones.push(clone);
        // Ẩn con thật đi
        childNode.visible(false);
        nodesToHide.push(childNode);
      }
    });

    // Clone tất cả edges liên quan (KHÔNG ẩn vì chúng sẽ tự động update vị trí)
    edges.forEach(edge => {
      if (childIdSet.has(edge.from) || childIdSet.has(edge.to)) {
        const edgeShape = stage.findOne(`#${edge.id}`);
        if (edgeShape) {
          const clone = edgeShape.clone();
          edgeClones.push(clone);
          // KHÔNG ẩn dây thật - để chúng tự động vẽ lại theo vị trí mới
        }
      }
    });

    // --- C. TẠO IMPOSTER GROUP (CÁI XÁC MỜ) ---
    if (nodeClones.length > 0 || edgeClones.length > 0) {
      const imposterGroup = new Konva.Group({
        listening: false,
        opacity: 0.3, // Làm mờ toàn bộ cái xác (30%)
        x: 0,
        y: 0
      });

      // Thêm Dây trước, Node sau
      edgeClones.forEach(clone => imposterGroup.add(clone));
      nodeClones.forEach(clone => imposterGroup.add(clone));
      
      layer.add(imposterGroup);

      // Cache thành ảnh tĩnh - tính bounding box thủ công hoàn toàn
      try {
        layer.batchDraw();
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        // Duyệt qua tất cả edges để tìm min/max
        edgeClones.forEach((clone: any) => {
          const points = clone.points();
          if (points && points.length > 0) {
            for (let i = 0; i < points.length; i += 2) {
              const x = points[i];
              const y = points[i + 1];
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        });
        
        // Duyệt qua tất cả nodes
        nodeClones.forEach((clone: any) => {
          const x = clone.x();
          const y = clone.y();
          const width = clone.width();
          const height = clone.height();
          const offsetX = clone.offsetX() || 0;
          const offsetY = clone.offsetY() || 0;
          
          // Tính toán đúng bounding box với offset
          const left = x - offsetX;
          const right = x - offsetX + width;
          const top = y - offsetY;
          const bottom = y - offsetY + height;
          
          minX = Math.min(minX, left);
          maxX = Math.max(maxX, right);
          minY = Math.min(minY, top);
          maxY = Math.max(maxY, bottom);
        });
        
        // Tăng padding để chắc chắn không bị cắt
        const padding = 100;
        const cacheWidth = (maxX - minX) + padding * 2;
        const cacheHeight = (maxY - minY) + padding * 2;
        
        if (isFinite(minX) && isFinite(cacheWidth) && cacheWidth > 0 && cacheHeight > 0) {
          imposterGroup.cache({
            x: minX - padding,
            y: minY - padding,
            width: cacheWidth,
            height: cacheHeight,
            pixelRatio: 1
          });
        }
      } catch (e) {
        console.warn('Cache error:', e);
      }

      imposterRef.current = imposterGroup;
      hiddenRealNodesRef.current = nodesToHide; // Chỉ lưu nodes, không lưu edges
      draggedNodeChildrenRef.current = new Set(childIds);
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
      handleLayout(); 
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
  }, [isDataLoaded]); // Chỉ depend on isDataLoaded, không depend on handleFitToScreen

  const handleDragMove = (e: any, draggedNodeId: string) => {
    // Detect drop target khi đang kéo
    const currentX = e.target.x();
    const currentY = e.target.y();
    
    let potentialDropTarget: string | null = null;
    let targetSide: 'left' | 'right' | null = null;
    
    for (const node of nodes) {
      if (node.id === draggedNodeId) continue;
      if (draggedNodeChildrenRef.current.has(node.id)) continue; // Không cho drop vào con
      
      const visual = nodeVisuals.get(node.id);
      if (!visual) continue;
      
      const { w, h } = visual.box;
      const { x, y } = visual.style;
      
      const isOver =
        currentX > x - w / 2 &&
        currentX < x + w / 2 &&
        currentY > y - h / 2 &&
        currentY < y + h / 2;
      
      if (isOver) {
        potentialDropTarget = node.id;
        
        // Calculate side for root based on which side has lower height
        if (node.id === 'root') {
          // Calculate total height of each side
          const calculateSideHeight = (side: 'left' | 'right'): number => {
            const sideNodes = nodes.filter(n => n.parentId === 'root' && n.side === side);
            if (sideNodes.length === 0) return 0;
            
            const getSubtreeHeight = (nodeId: string): number => {
              const visual = nodeVisuals.get(nodeId);
              const selfHeight = visual?.box.h || 60;
              const children = edges.filter(e => e.from === nodeId).map(e => e.to);
              if (children.length === 0) return selfHeight;
              
              const childrenHeight = children.reduce((sum, childId) => sum + getSubtreeHeight(childId), 0);
              return selfHeight + childrenHeight + (children.length - 1) * 20;
            };
            
            return sideNodes.reduce((sum, node) => sum + getSubtreeHeight(node.id), 0);
          };
          
          const leftHeight = calculateSideHeight('left');
          const rightHeight = calculateSideHeight('right');
          
          // Show hint on the side with lower height
          targetSide = leftHeight <= rightHeight ? 'left' : 'right';
        }
        break;
      }
    }
    
    if (dropTargetNodeId !== potentialDropTarget) {
      setDropTargetNodeId(potentialDropTarget);
    }
    if (dropTargetSide !== targetSide) {
      setDropTargetSide(targetSide);
    }
  };

  const handleDragEnd = (e: any, draggedNodeId: string) => {
    // Fix: Root node không thể drag, chỉ reset về vị trí 0,0
    if (draggedNodeId === 'root') {
      e.target.position({ x: 0, y: 0 });
      setDragStartState(null);
      setDropTargetNodeId(null);
      setDraggingNodeId(null);
      draggedNodeChildrenRef.current.clear();
      if (imposterRef.current) {
        imposterRef.current.destroy();
        imposterRef.current = null;
      }
      if (hiddenRealNodesRef.current.length > 0) {
        hiddenRealNodesRef.current.forEach(node => node.visible(true));
        hiddenRealNodesRef.current = [];
      }
      return;
    }

    // Cleanup Imposter
    if (imposterRef.current) {
      imposterRef.current.destroy();
      imposterRef.current = null;
    }

    // Hiện lại nodes thật
    if (hiddenRealNodesRef.current.length > 0) {
      hiddenRealNodesRef.current.forEach(node => node.visible(true));
      hiddenRealNodesRef.current = [];
    }
    
    draggedNodeChildrenRef.current.clear();
    setDropTargetNodeId(null);
    setDropTargetSide(null);
    setDraggingNodeId(null);
    setDragStartState(null);
    const finalX = e.target.x();
    const finalY = e.target.y();

    // Check drop target khi thả (thay vì trong khi drag)
    let dropTargetId: string | null = null;
    for (const node of nodes) {
      if (node.id === draggedNodeId) continue;
      const visual = nodeVisuals.get(node.id);
      if (!visual) continue;
      const { w, h } = visual.box;
      const { x, y } = visual.style;
      const isOver =
        finalX > x - w / 2 &&
        finalX < x + w / 2 &&
        finalY > y - h / 2 &&
        finalY < y + h / 2;
      if (isOver) {
        dropTargetId = node.id;
        break;
      }
    }

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
        // Phục hồi vị trí cũ của node
        if (dragStartState) {
          const oldNode = dragStartState.nodes.find(n => n.id === draggedNodeId);
          if (oldNode) {
            e.target.position({ x: oldNode.x, y: oldNode.y });
          }
          setGraph(dragStartState.nodes, dragStartState.edges);
        }
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
      // Determine new side
      let newSide = nodeMap.get(newParentId)?.side || 'right';
      const gs = useEditorStore.getState().globalStructure;
      if (gs === 'logic') {
        // In logic mode, always force children to the right
        newSide = 'right';
      } else {
        // If dropping onto ROOT, use the side indicated by the drop target indicator (green plus sign)
        if (newParentId === 'root' && dropTargetSide) {
          // Use the side where the indicator was shown during drag
          newSide = dropTargetSide;
        } else if (newParentId === 'root') {
          // Fallback: if dropTargetSide wasn't set, infer by drop x relative to root
          const rootNode = nodes.find(n => n.id === 'root');
          if (rootNode) {
            newSide = (finalX < rootNode.x) ? 'left' : 'right';
          }
        }
      }
      // Áp dụng format theme phân cấp: reset style về undefined để kế thừa theme
      const newNodes = nodes.map((n) =>
        n.id === draggedNodeId
          ? {
              ...n,
              parentId: newParentId,
              x: finalX,
              y: finalY,
              side: newSide,
              // Reset các thuộc tính style để node kế thừa theme phân cấp mới
              color: undefined,
              borderColor: undefined,
              textColor: undefined,
              fontSize: undefined,
              fontWeight: undefined,
              borderWidth: undefined,
              shape: undefined,
            }
          : n
      );
      setGraph(newNodes, newEdges);
      sendPatch('NODE_REPARENT', {
        nodeId: draggedNodeId, newParentId, x: finalX, y: finalY, side: newSide,
      });
      // Layout lại khi thay đổi parent
      setTimeout(() => {
        handleLayout();
        // Smart pan: ensure moved node is visible
        setTimeout(() => {
          // ensureNodeVisible removed
        }, 100);
      }, 50); 
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
      // Re-run layout so summary nodes stay anchored to their braces
      setTimeout(() => handleLayout(), 0);
    }
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
    useEditorStore.setState({ backgroundColor: color, isDirty: true });
    pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
    
    // Lưu ngay lập tức
    if (id) {
      const { nodes: currentNodes, edges: currentEdges } = useEditorStore.getState();
      if (isGuest) {
        const { relationships, summaries } = useEditorStore.getState();
        saveGuestDoc(id, name, currentNodes, currentEdges, relationships, summaries);
      } else if (isAuthed) {
        const { relationships, summaries } = useEditorStore.getState();
        const docToSave = { name, content: { nodes: currentNodes, edges: currentEdges, relationships, summaries } };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu màu nền thất bại:', e);
        });
      }
    }
    
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
    useEditorStore.setState({ isDirty: true });
    
    // Lưu ngay lập tức
    if (id) {
      const { relationships, summaries } = useEditorStore.getState();
      if (isGuest) {
        saveGuestDoc(id, name, newNodes, edges, relationships, summaries);
      } else if (isAuthed) {
        const docToSave = { name, content: { nodes: newNodes, edges, relationships, summaries } };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu màu dây thất bại:', e);
        });
      }
    }
    
    sendPatch('GLOBAL_BRANCH_COLOR_CHANGE', { color });
  };

  const handleApplyQuickStyle = (styleId: QuickStyleId) => {
    if (selectedNodeIds.length === 0) return;
    const idSet = selectedIdsSet;

    const newNodes = nodes.map((n) => {
      if (idSet.has(n.id)) {
        // Chỉ set quickStyleId, không reset các properties khác
        // getNodeComputedStyle sẽ tự động áp dụng quick style colors
        return { 
          ...n, 
          quickStyleId: styleId,
          // Xóa các override colors để quick style có hiệu lực
          color: undefined,
          borderColor: undefined,
          textColor: undefined,
          borderWidth: undefined,
          fontWeight: undefined,
          textDecoration: undefined,
          fontSize: undefined,
          textCase: undefined,
        };
      }
      return n;
    });
    
    setGraph(newNodes, edges);
    setTimeout(() => handleLayout(), 50);
    debouncedPushHistory();
    
    // Lưu ngay lập tức
    if (id) {
      const { relationships, summaries } = useEditorStore.getState();
      if (isGuest) {
        saveGuestDoc(id, name, newNodes, edges, relationships, summaries);
      } else if (isAuthed) {
        const docToSave = { name, content: { nodes: newNodes, edges, relationships, summaries } };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu quick style thất bại:', e);
        });
      }
    }
    
    // Gửi patch cho TỪNG node
    selectedNodeIds.forEach(nodeId => {
      sendPatch('NODE_QUICK_STYLE_APPLY', { id: nodeId, styleId });
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
    
    // [OPTIMIZATION] Dirty checking - chỉ layout nếu có style ảnh hưởng đến kích thước
    const needsLayout = styleClipboard.fontSize !== undefined || 
                        styleClipboard.borderWidth !== undefined;
    
    const newNodes = nodes.map((n) =>
      idSet.has(n.id) ? { ...n, ...styleClipboard } : n
    );
    setGraph(newNodes, edges);
    
    // Chỉ trigger layout nếu style ảnh hưởng đến dimension (fontSize, padding, border)
    // Theo spec: màu sắc chỉ cần Repaint
    if (needsLayout) {
      setTimeout(() => handleLayout(), 50);
    }
    
    debouncedPushHistory();
    
    // Lưu ngay lập tức
    if (id) {
      const { relationships, summaries } = useEditorStore.getState();
      if (isGuest) {
        saveGuestDoc(id, name, newNodes, edges, relationships, summaries);
      } else if (isAuthed) {
        const docToSave = { name, content: { nodes: newNodes, edges, relationships, summaries } };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu paste style thất bại:', e);
        });
      }
    }
    
    sendPatch('NODE_STYLE_PASTE', { id: selectedNodeIds, style: styleClipboard }); 
  };

  const handleResetStyle = () => {
    if (!selectedNodeIds || !currentNode) return;
    const idSet = selectedIdsSet;
    const resetStyle = applyNodeDefaults(currentNode, activeTheme);
    
    // [OPTIMIZATION] Reset style có thể thay đổi fontSize, borderWidth -> cần layout
    const needsLayout = resetStyle.fontSize !== undefined || 
                        resetStyle.borderWidth !== undefined;
    
    const newNodes = nodes.map((n) =>
      idSet.has(n.id) ? { ...n, ...resetStyle } : n
    );
    setGraph(newNodes, edges);
    
    // Chỉ layout nếu có thay đổi dimension
    if (needsLayout) {
      setTimeout(() => handleLayout(), 50);
    }
    
    debouncedPushHistory();
    
    // Lưu ngay lập tức
    if (id) {
      const { relationships, summaries } = useEditorStore.getState();
      if (isGuest) {
        saveGuestDoc(id, name, newNodes, edges, relationships, summaries);
      } else if (isAuthed) {
        const docToSave = { name, content: { nodes: newNodes, edges, relationships, summaries } };
        mindmapsApi.update(id, docToSave).catch((e) => {
          console.error('Lưu reset style thất bại:', e);
        });
      }
    }
    
    sendPatch('NODE_STYLE_RESET', { id: selectedNodeIds, resetStyle }); 
  };

  const handleToggleCollapse = useCallback(
    (e: any, nodeId: string, side?: 'left' | 'right') => {
      e.cancelBubble = true;
      
      if (nodeId === 'root' && side) {
        setRootCollapse(prev => ({ ...prev, [side]: !prev[side] }));
        
        // [FIX YÊU CẦU 2] Bỏ selection nếu node đang select thuộc nhánh bị đóng
        const affectedChildren = edges.filter(e => e.from === 'root').map(e => e.to);
        const childrenOnSide = affectedChildren.filter(childId => {
          const childNode = nodeMap.get(childId);
          return childNode?.side === side;
        });
        
        // Tìm tất cả descendants của children trên side này
        const getAllDescendants = (nodeId: string): string[] => {
          const children = edges.filter(e => e.from === nodeId).map(e => e.to);
          if (children.length === 0) return [];
          return [...children, ...children.flatMap(c => getAllDescendants(c))];
        };
        
        const allAffectedIds = new Set([
          ...childrenOnSide,
          ...childrenOnSide.flatMap(id => getAllDescendants(id))
        ]);
        
        // Nếu có node đang select nằm trong nhánh bị đóng, clear selection
        const hasSelectedInCollapsedBranch = selectedNodeIds.some(id => allAffectedIds.has(id));
        if (hasSelectedInCollapsedBranch) {
          setSelectedNodeIds([]);
        }
        
        sendPatch('ROOT_TOGGLE_COLLAPSE', { side });
        setTimeout(() => handleLayout(), 0);
      } else if (nodeId !== 'root') {
        const node = nodeMap.get(nodeId);
        if (!node) return;
        
        const wasCollapsed = node.collapsed;
        
        // [FIX YÊU CẦU 2] Nếu đang đóng nhánh, bỏ selection các node con
        if (!wasCollapsed) {
          // Đang expand -> sắp collapse, tìm tất cả descendants
          const getAllDescendants = (nodeId: string): string[] => {
            const children = edges.filter(e => e.from === nodeId).map(e => e.to);
            if (children.length === 0) return [];
            return [...children, ...children.flatMap(c => getAllDescendants(c))];
          };
          
          const allDescendants = new Set(getAllDescendants(nodeId));
          const hasSelectedInCollapsedBranch = selectedNodeIds.some(id => allDescendants.has(id));
          
          if (hasSelectedInCollapsedBranch) {
            setSelectedNodeIds([]);
          }
        }
        
        // [SMART ANCHOR] Lưu vị trí hiện tại của node để giữ anchor point
        const visual = nodeVisuals.get(nodeId);
        if (visual) {
          const nodeScreenX = pos.x + node.x * scale;
          const nodeScreenY = pos.y + node.y * scale;
          
          const newNodes = nodes.map(n => 
            n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
          );
          setGraph(newNodes, edges);
          
          // Sau khi layout, giữ node ở cùng vị trí screen
          setTimeout(() => {
            const updatedNode = useEditorStore.getState().nodes.find(n => n.id === nodeId);
            if (updatedNode) {
              const newPosX = nodeScreenX - updatedNode.x * scale;
              const newPosY = nodeScreenY - updatedNode.y * scale;
              setPos({ x: newPosX, y: newPosY });
              
              // [AUTO-SCROLL TO CHILDREN] Nếu đang expand, pan đến children
              if (wasCollapsed) {
                // Tính toán bounding box của các children mới hiện ra
                const children = edges.filter(e => e.from === nodeId).map(e => e.to);
                if (children.length > 0) {
                  const childNodes = useEditorStore.getState().nodes.filter(n => children.includes(n.id));
                  if (childNodes.length > 0) {
                    let minChildX = Infinity, maxChildX = -Infinity;
                    childNodes.forEach(child => {
                      const childVisual = nodeVisuals.get(child.id);
                      if (childVisual) {
                        const childLeft = child.x - childVisual.box.w / 2;
                        const childRight = child.x + childVisual.box.w / 2;
                        minChildX = Math.min(minChildX, childLeft);
                        maxChildX = Math.max(maxChildX, childRight);
                      }
                    });
                    
                    // Kiểm tra xem children có nằm ngoài viewport không
                    const panelOffset = isFormattingToolbarOpen ? PANEL_WIDTH : 0;
                    const visibleWidth = window.innerWidth - panelOffset;
                    const rightEdge = maxChildX * scale + newPosX;
                    
                    // Nếu children bị overflow, pan sang phải
                    if (rightEdge > visibleWidth - 50) {
                      const adjustX = visibleWidth - rightEdge - 50;
                      setPos({ x: newPosX + adjustX, y: newPosY });
                    }
                  }
                }
              }
            }
          }, 60); // Đợi layout hoàn tất
        }
        
        debouncedPushHistory();
        debouncedPersistData();
        sendPatch('NODE_TOGGLE_COLLAPSE', { id: nodeId }); 
        setTimeout(() => handleLayout(), 0);
      }
    },
    [
      nodes, edges, setGraph, nodeMap, nodeVisuals, scale, pos, 
      selectedNodeIds, isFormattingToolbarOpen, PANEL_WIDTH,
      debouncedPushHistory, debouncedPersistData, sendPatch, 
    ]
  );

  const isNodeVisible = useCallback((nodeId: string): boolean => {
    const node = nodeMap.get(nodeId);
    if (!node) return false;
    if (nodeId === 'root' || !node.parentId) return true;
    
    // [FIX] Label nodes của relationships: ẩn nếu relationship ẩn
    if (node.parentId?.startsWith('rel_')) {
      const relationship = relationships.find(r => r.id === node.parentId);
      if (!relationship) return false;
      // Label node visible nếu cả 2 nodes của relationship đều visible
      return isNodeVisible(relationship.from) && isNodeVisible(relationship.to);
    }
    
    // [FIX] Summary nodes: ẩn nếu summary ẩn
    if (node.parentId?.startsWith('sum_')) {
      const summary = summaries.find(s => s.id === node.parentId);
      if (!summary) return false;
      // Summary node visible nếu parent và start/end đều visible
      return isNodeVisible(summary.parentId) && 
             isNodeVisible(summary.startNodeId) && 
             isNodeVisible(summary.endNodeId);
    }
    
    if (node.parentId === 'root') {
      if (node.side === 'left' && rootCollapse.left) return false;
      if ((node.side === 'right' || !node.side) && rootCollapse.right) return false;
    }
    const parent = nodeMap.get(node.parentId);
    if (!parent) return true;
    if (parent.collapsed) return false;
    if (parent.id === 'root') return true;
    return isNodeVisible(node.parentId);
  }, [nodeMap, rootCollapse, relationships, summaries]);

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
  
  // [MỚI] Lọc relationships: chỉ hiện nếu CẢ 2 node from/to đều visible
  const visibleRelationships = useMemo(
    () =>
      relationships.filter(
        (r) => visibleNodeIds.has(r.from) && visibleNodeIds.has(r.to)
      ),
    [relationships, visibleNodeIds]
  );
  
  // [MỚI] Lọc summaries: chỉ hiện nếu TẤT CẢ nodes liên quan đều visible
  const visibleSummaries = useMemo(
    () =>
      summaries.filter((s) => {
        // Check parent node visible (đệ quy) - isNodeVisible đã kiểm tra collapsed đệ quy
        if (!isNodeVisible(s.parentId)) return false;
        
        // Check start và end nodes visible (đệ quy)
        if (!isNodeVisible(s.startNodeId)) return false;
        if (!isNodeVisible(s.endNodeId)) return false;
        
        // Check tất cả nodes GIỮA start và end cũng phải visible
        const parent = nodeMap.get(s.parentId);
        if (!parent) return false;
        
        const siblings = nodes.filter(n => n.parentId === s.parentId);
        const startIdx = siblings.findIndex(n => n.id === s.startNodeId);
        const endIdx = siblings.findIndex(n => n.id === s.endNodeId);
        
        if (startIdx === -1 || endIdx === -1) return false;
        
        const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        
        // Tất cả nodes trong range phải visible
        for (let i = minIdx; i <= maxIdx; i++) {
          if (!isNodeVisible(siblings[i].id)) return false;
        }
        
        return true;
      }),
    [summaries, isNodeVisible, nodeMap, nodes]
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
      // Keep layout synced while typing so summary braces/text follow width changes
      setTimeout(() => handleLayout(), 0);
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
      {/* [FLEXBOX LAYOUT] Main container with flex layout for docking sidebar */}
      <div className="w-screen h-screen bg-white overflow-hidden flex flex-col">
        <EditorToolbar
          onCommitName={() => {
            // Save immediately when name is changed
            if (isAuthed && id) {
              const content = { nodes: nodes, edges };
              mindmapsApi.update(id, { name, content }).catch((e) => {
                console.error('Save name failed:', e);
              });
            } else if (isGuest && id) {
              const { relationships, summaries } = useEditorStore.getState();
              saveGuestDoc(id, name, nodes, edges, relationships, summaries);
            }
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
          presentationMode={presentationMode}
          onSetPresentationMode={setPresentationMode}
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
          onAddRelationship={handleAddRelationship}
          onAddSummary={handleAddSummary}
          stageRef={stageRef}
        />
        {!presentationMode && <Sidebar />}

        {editingNodeId &&
          (() => {
            const visual = nodeVisuals.get(editingNodeId!);
            const node = nodeMap.get(editingNodeId!);
            if (!visual || !node || !stageRef.current) return null;

            const { style, box } = visual;
            const stageRect = stageRef.current.container().getBoundingClientRect();
            const absoluteX = stageRect.left + pos.x + style.x * scale;
            const absoluteY = stageRect.top + pos.y + style.y * scale;
            
            // Check if Level 3+
            const topology = nodeTopology.get(editingNodeId!);
            const depth = topology?.depth || 0;
            const isUnderlineStyle = depth >= 3 && editingNodeId !== 'root';

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
                  padding: isUnderlineStyle ? '4px 2px' : `${PADDING_Y}px ${PADDING_X}px`,
                  textAlign: (visual.style.textAlign || 'CENTER').toLowerCase() as 'left' | 'center' | 'right',
                  textDecoration: visual.style.textDecoration || 'none',
                  color: visual.style.textColor || '#333333',
                  backgroundColor: isUnderlineStyle ? 'transparent' : visual.style.color,
                  
                  border: isUnderlineStyle ? 'none' : `${visual.style.borderWidth || 0}px ${
                    visual.style.borderStyle === 'dashed' ? 'dashed'
                    : visual.style.borderStyle === 'dotted' ? 'dotted'
                    : 'solid'
                  } ${visual.style.borderColor || 'transparent'}`,
                  borderBottom: isUnderlineStyle ? `2px solid ${topology?.branchBaseColor || '#666'}` : undefined,
                  borderRadius: isUnderlineStyle ? '0px' : (visual.style.shape === 'roundedRect' ? '8px' : '0px'),
                  
                  boxSizing: 'border-box',
                  outline: 'none',
                  boxShadow: isUnderlineStyle 
                    ? 'none'
                    : '0 0 0 2px #3b82f6, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 100,
                  overflow: 'hidden',
                  resize: 'none',
                  transition: 'all 0.2s ease',
                }}
                className="" 
              />
            );
          })()}

        <div className="flex flex-row flex-1 overflow-hidden">
          {/* [CANVAS AREA] Flex: 1 auto, adjusts when panel opens */}
          <div
            ref={canvasContainerRef}
            className="flex-1 pt-12 relative transition-all duration-300 ease-in-out"
            style={{ 
              backgroundColor,
              width: isFormattingToolbarOpen ? `calc(100% - ${PANEL_WIDTH}px)` : '100%'
            }}
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
                  // Deselect relationship, summary, and boundary when clicking canvas
                  setSelectedRelationshipId(null);
                  setSelectedSummaryId(null);
                  setSelectedBoundaryId(null);
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
                
                // Nếu chuột ra ngoài canvas (pos = null), giữ nguyên selectionRect để onMouseLeave xử lý
                if (!pos) {
                  return;
                }
                
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
            onMouseLeave={() => {
              // Khi chuột rời khỏi canvas, kết thúc selection nhưng vẫn select nodes trong vùng
              if (isSelecting.current && selectionRect.visible) {
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

                setSelectedNodeIds(newlySelectedIds);
                isSelecting.current = false;
                setSelectionRect({ visible: false, x: 0, y: 0, width: 0, height: 0 });
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
                // Thêm các thuộc tính style mặc định
                ...DEFAULT_NODE_STYLE,
                quickStyleId: 'default',
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
                    isSelected={selectedBoundaryId === node.id}
                    onClick={() => {
                      setSelectedBoundaryId(node.id);
                      setSelectedRelationshipId(null);
                      setSelectedSummaryId(null);
                      setSelectedNodeIds([]);
                    }}
                    onDelete={() => handleDeleteBoundary(node.id)}
                  />
                ) : null
              )}
              {visibleEdges.map((edge) => {
                // Check if this edge should be faded when dragging
                const isDraggingRelated = draggingNodeId && (
                  edge.from === draggingNodeId || 
                  edge.to === draggingNodeId ||
                  draggedNodeChildrenRef.current.has(edge.from) ||
                  draggedNodeChildrenRef.current.has(edge.to)
                );
                
                // Check if this is a summary edge (from a summary to its summary node)
                const isSummaryEdge = edge.from.startsWith('sum_');
                
                if (isSummaryEdge) {
                  // Find the summary data
                  const summary = summaries.find(s => s.id === edge.from);
                  if (!summary) return null;
                  
                  const toVisual = nodeVisuals.get(edge.to);
                  if (!toVisual) return null;
                  
                  // Calculate brace position (same logic as Summary.tsx)
                  const parentNode = nodes.find(n => n.id === summary.parentId);
                  if (!parentNode) return null;
                  
                  const siblings = nodes.filter(n => n.parentId === summary.parentId);
                  const startIdx = siblings.findIndex(n => n.id === summary.startNodeId);
                  const endIdx = siblings.findIndex(n => n.id === summary.endNodeId);
                  if (startIdx === -1 || endIdx === -1) return null;
                  
                  const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                  const parentVisual = nodeVisuals.get(parentNode.id);
                  if (!parentVisual) return null;
                  
                  const isLeft = parentVisual.style.side === 'left';
                  
                  // Collect leaf nodes
                  const collectLeafNodes = (nodeId: string): string[] => {
                    const children = nodes.filter(n => n.parentId === nodeId);
                    if (children.length === 0) return [nodeId];
                    return children.flatMap(child => collectLeafNodes(child.id));
                  };
                  
                  const leafNodes: string[] = [];
                  for (let i = minIdx; i <= maxIdx; i++) {
                    leafNodes.push(...collectLeafNodes(siblings[i].id));
                  }
                  
                  // Calculate outermost X and Y range
                  let braceX = isLeft ? Infinity : -Infinity;
                  let startY = Infinity;
                  let endY = -Infinity;
                  
                  leafNodes.forEach(leafId => {
                    const visual = nodeVisuals.get(leafId);
                    if (visual) {
                      const { style, box } = visual;
                      const nodeLeft = style.x - box.w / 2;
                      const nodeRight = style.x + box.w / 2;
                      const nodeTop = style.y - box.h / 2;
                      const nodeBottom = style.y + box.h / 2;
                      
                      if (isLeft) {
                        braceX = Math.min(braceX, nodeLeft);
                      } else {
                        braceX = Math.max(braceX, nodeRight);
                      }
                      
                      startY = Math.min(startY, nodeTop);
                      endY = Math.max(endY, nodeBottom);
                    }
                  });
                  
                  const direction = isLeft ? -1 : 1;
                  const braceWidth = 15;
                  const startX = isLeft ? braceX - 20 : braceX + 20;
                  const midY = (startY + endY) / 2;
                  const xMid = startX + (braceWidth * direction * 1.5);
                  
                  // Edge starts from brace tip, ends at summary node
                  const p1 = { x: xMid, y: midY };
                  const p4 = { x: toVisual.style.x + (isLeft ? toVisual.box.w / 2 : -toVisual.box.w / 2), y: toVisual.style.y };
                  const points = [p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y];
                  
                  // Use summary color for arrow
                  const summaryColor = summary.color || '#f59e0b';
                  
                  return <Arrow
                    key={edge.id}
                    points={points}
                    stroke={summaryColor}
                    strokeWidth={2}
                    bezier={true}
                    lineCap="round"
                    lineJoin="round"
                    pointerLength={8}
                    pointerWidth={6}
                    fill={summaryColor}
                  />;
                }
                
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
                } else if (globalStructure === 'mindmap' || globalStructure === 'logic') {
                  // Check if fromNode and toNode are Level 3+ (has underline)
                  const fromTopology = nodeTopology.get(edge.from);
                  const fromDepth = fromTopology?.depth || 0;
                  const isFromUnderline = fromDepth >= 3 && edge.from !== 'root';
                  
                  const toTopology = nodeTopology.get(edge.to);
                  const toDepth = toTopology?.depth || 0;
                  const isToUnderline = toDepth >= 3;
                  
                  // Nếu fromNode là Level 3+, edge mọc từ underline
                  if (isFromUnderline) {
                    p1 = { 
                      x: fromStyle.x + (fromSide === 'left' ? -fromBox.w / 2 - 10 : fromBox.w / 2 + 10), 
                      y: fromStyle.y + fromBox.h / 2 - 2 // Vị trí underline
                    };
                  } else if (edge.from === 'root') {
                    p1 = { x: fromStyle.x + (toSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  } else {
                    p1 = { x: fromStyle.x + (fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  }
                  
                  // Nếu toNode là Level 3+, edge kết nối vào underline
                  if (isToUnderline) {
                    p4 = { 
                      x: toStyle.x + (toSide === 'left' ? toBox.w / 2 + 10 : -toBox.w / 2 - 10), 
                      y: toStyle.y + toBox.h / 2 - 2 // Vị trí underline
                    };
                  } else {
                    p4 = { x: toStyle.x + (toSide === 'left' ? toBox.w / 2 : -toBox.w / 2), y: toStyle.y };
                  }
                  
                  points = [ p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y ];
                } else {
                  p1 = { x: fromStyle.x + (fromSide === 'left' ? -fromBox.w / 2 : fromBox.w / 2), y: fromStyle.y };
                  p4 = { x: toStyle.x + (toSide === 'left' ? toBox.w / 2 : -toBox.w / 2), y: toStyle.y };
                  points = [ p1.x, p1.y, (p1.x + p4.x) / 2, p1.y, (p1.x + p4.x) / 2, p4.y, p4.x, p4.y ];
                }
                // Sử dụng màu từ branchColor của fromNode, nếu không có thì dùng globalBranchColor
                const fromNode = nodes.find(n => n.id === edge.from);
                const strokeColor = fromNode?.branchColor || fromStyle.branchColor || globalBranchColor;
                
                // Apply node's branch line thickness or fallback to global setting
                // 'normal' means use global setting, only 'thin' or 'thick' override
                const nodeThickness = fromStyle.branchLineThickness === 'thin' ? 1 : fromStyle.branchLineThickness === 'thick' ? 3 : undefined;
                const strokeWidth = nodeThickness !== undefined ? nodeThickness : (branchLineWidth || 2);
                const isBezier = fromStyle.branchLineStyle === 'bezier' && globalStructure !== 'org'; // Changed to fromStyle
                const lineProps = {
                  points: points,
                  stroke: strokeColor,
                  strokeWidth: strokeWidth,
                  bezier: isBezier,
                  lineCap: 'round' as const,
                  lineJoin: 'round' as const,
                  opacity: isDraggingRelated ? 0.3 : 1, // Ẩn mờ khi drag
                };
                if (fromStyle.branchLineEnd === 'arrow') { // Changed to fromStyle
                  return <Arrow {...lineProps} key={edge.id} pointerLength={8} pointerWidth={6} fill={strokeColor} />;
                }
                return <Line {...lineProps} key={edge.id} />;
              })}

              {/* Render Relationships - CHỈ hiện những cái visible */}
              {visibleRelationships.map((rel) => (
                <Relationship
                  key={rel.id}
                  relationship={rel}
                  nodes={nodes}
                  nodeVisuals={nodeVisuals}
                  isSelected={selectedRelationshipId === rel.id}
                  onUpdateControlPoints={handleUpdateRelationshipControlPoints}
                  onUpdateLabel={handleUpdateRelationshipLabel}
                  onClick={(id) => {
                    setSelectedRelationshipId(id);
                    setSelectedSummaryId(null);
                    setSelectedBoundaryId(null);
                    setSelectedNodeIds([]);
                  }}
                  onDelete={() => handleDeleteRelationship(rel.id)}
                />
              ))}

              {/* Render Summaries - CHỈ hiện những cái visible */}
              {visibleSummaries.map((sum) => (
                <Summary
                  key={sum.id}
                  summary={sum}
                  nodes={nodes}
                  nodeVisuals={nodeVisuals}
                  isSelected={selectedSummaryId === sum.id}
                  onUpdateRange={handleUpdateSummaryRange}
                  onClick={() => {
                    setSelectedSummaryId(sum.id);
                    setSelectedRelationshipId(null);
                    setSelectedBoundaryId(null);
                    setSelectedNodeIds([]);
                  }}
                  onDelete={() => handleDeleteSummary(sum.id)}
                />
              ))}

              {visibleNodes.map((node) => {
                const visual = nodeVisuals.get(node.id);
                if (!visual) return null;
                const { style, box } = visual;
                const { w, h, textToRender, finalFontSize, imageHeight, imageWidthDisplay } = box;
                const isSelected = selectedIdsSet.has(node.id);
                const hasChildren = nodesWithChildren.has(node.id);
                const isDropTarget = dropTargetNodeId === node.id;
                const isDragging = draggingNodeId === node.id;
                const combinedFontStyle = (style.fontStyle === 'italic' ? 'italic ' : '') + (style.fontWeight === 'bold' ? 'bold' : 'normal');
                const shapeProps = {
                  width: w, height: h, offsetX: w / 2, offsetY: h / 2,
                  fill: style.color,
                  stroke: isDropTarget ? "#10b981" : (isSelected ? "#3b82f6" : style.borderColor),
                  strokeWidth: isDropTarget ? 4 : (isSelected ? 3 : (style.borderWidth || 0)),
                  dash: style.borderStyle === 'dashed' ? [8, 4] : (style.borderStyle === 'dotted' ? [2, 3] : undefined),
                };
                const isFading = fadingInRef.current.has(node.id);
                return (
                  <Group
                    key={node.id} id={node.id} x={style.x} y={style.y} 
                    draggable={node.id !== 'root'}
                    {...(isFading ? {} : { opacity: (isDragging ? 0.75 : 1) })}
                    onDragStart={() => handleDragStart(node.id)}
                    onDragMove={(e) => handleDragMove(e, node.id)}
                    onDragEnd={(e) => handleDragEnd(e, node.id)}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      
                      // Relationship mode: tạo relationship khi click node thứ 2
                      if (isRelationshipMode && relationshipFrom && relationshipFrom !== node.id) {
                        addRelationship(relationshipFrom, node.id);
                        setIsRelationshipMode(false);
                        setRelationshipFrom(null);
                        return;
                      }
                      
                      // Check if this is a label node of relationship
                      const relatedRelationship = relationships.find(r => r.labelNodeId === node.id);
                      if (relatedRelationship) {
                        setSelectedRelationshipId(relatedRelationship.id);
                        setSelectedSummaryId(null);
                        setSelectedNodeIds([]);
                        return;
                      }
                      
                      // Check if this is a summary node
                      const relatedSummary = summaries.find(s => s.summaryNodeId === node.id);
                      if (relatedSummary) {
                        setSelectedSummaryId(relatedSummary.id);
                        setSelectedRelationshipId(null);
                      } else {
                        setSelectedSummaryId(null);
                        setSelectedRelationshipId(null);
                      }
                      
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
                    {(() => {
                      const topology = nodeTopology.get(node.id);
                      const depth = topology?.depth || 0;
                      
                      // Level 3+: Render underline (ngoại trừ org)
                      if (depth >= 3 && node.id !== 'root' && useEditorStore.getState().globalStructure !== 'org') {
                        return (
                          <>
                            <Rect 
                              width={w} 
                              height={h} 
                              offsetX={w / 2} 
                              offsetY={h / 2}
                              fill="transparent"
                              stroke={isSelected ? "#3b82f6" : "transparent"}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                            
                            <Line
                              points={[-w/2 - 10, h/2 - 2, w/2 + 10, h/2 - 2]}
                              stroke={topology?.branchBaseColor || style.borderColor}
                              strokeWidth={2}
                              lineCap="round"
                              listening={false}
                            />
                          </>
                        );
                      }
                      
                      return (
                        <>
                          {(style.shape === 'rectangle' || style.shape === 'roundedRect') && (
                            <Rect {...shapeProps} cornerRadius={style.shape === 'roundedRect' ? 8 : 0} />
                          )}
                          
                          {/* Tạm comment URLImage do useImage không available
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
                          */}
                        </>
                      );
                    })()}

                    <Text
                      visible={editingNodeId !== node.id}
                      text={node.id === 'root' ? (textToRender || '(...)').toUpperCase() : (textToRender || '(...)')}
                      width={w} 
                      height={style.imageUrl ? (h - imageHeight - 10) : h} 
                      offsetX={w / 2} 
                      offsetY={style.imageUrl ? (h / 2) - imageHeight - 10 : h / 2} 
                      align={(style.textAlign || 'CENTER').toLowerCase() as 'left' | 'center' | 'right'}
                      verticalAlign="middle"
                      fill={style.textColor}
                      padding={PADDING_Y} listening={false}
                      fontSize={finalFontSize}
                      fontStyle={combinedFontStyle}
                      fontFamily={style.fontFamily}
                      textDecoration={style.textDecoration === 'none' ? undefined : style.textDecoration}
                      lineHeight={LINE_HEIGHT_MULTIPLIER}
                    />
                    
                    {isDropTarget && (
                      <Group 
                        x={
                          globalStructure === 'org' ? 0 : 
                          (node.id === 'root' && dropTargetSide === 'left') ? (-w / 2 - 15) :
                          (node.id === 'root' && dropTargetSide === 'right') ? (w / 2 + 15) :
                          (style.side === 'left' ? (-w / 2 - 15) : (w / 2 + 15))
                        } 
                        y={globalStructure === 'org' ? (h / 2 + 15) : 0}
                      >
                        <Circle radius={12} fill="#10b981" stroke="#FFFFFF" strokeWidth={2} />
                        <Text
                          text="+"
                          fontSize={18}
                          fill="#FFFFFF"
                          align="center"
                          verticalAlign="middle"
                          width={24}
                          height={24}
                          offsetX={12}
                          offsetY={12}
                          fontStyle="bold"
                          listening={false}
                        />
                      </Group>
                    )}
                    
                    {node.id === 'root' ? (
                      // Root node không có nút collapse/expand
                      null
                    ) : (
                      hasChildren && (node.collapsed || hoveredNodeId === node.id) && (
                        <Group
                          x={globalStructure === 'org' ? 0 : (style.side === 'left' ? -w / 2 : w / 2)}
                          y={globalStructure === 'org' ? (h / 2) : ((nodeTopology.get(node.id)?.depth || 0) >= 3 ? (h / 2 - 2) : 0)}
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
          </div>

          {/* [PROPERTIES PANEL] Docked sidebar with fixed width and smooth transition */}
          <div
            className="transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: isFormattingToolbarOpen ? `${PANEL_WIDTH}px` : '0px',
              flexShrink: 0,
              borderLeft: isFormattingToolbarOpen ? '1px solid #e5e7eb' : 'none'
            }}
          >
            {isFormattingToolbarOpen && !presentationMode && (
              <FormattingToolbar
              selectedIds={selectedNodeIds}
              currentNode={currentNode}
              currentBackgroundColor={backgroundColor}
              globalStructure={globalStructure}
              activeColorThemeId={activeColorThemeId}

              onApplyLayout={(structure: GlobalStructure) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                setGlobalStore({ globalStructure: structure });
                
                // Nếu chuyển sang mindmap, dùng rebalance để chia đều 2 bên
                if (structure === 'mindmap') {
                  handleRebalanceLayout();
                } else {
                  handleLayout();
                }
                
                useEditorStore.setState({ isDirty: true });

                // Fit to screen sau khi apply layout
                setTimeout(() => {
                  handleFitToScreen();
                }, 100);
                
                // Lưu ngay lập tức
                if (id) {
                  const { nodes: currentNodes, edges: currentEdges, relationships, summaries } = useEditorStore.getState();
                  if (isGuest) {
                    saveGuestDoc(id, name, currentNodes, currentEdges, relationships, summaries);
                  } else if (isAuthed) {
                    const docToSave = { name, content: { nodes: currentNodes, edges: currentEdges, relationships, summaries } };
                    mindmapsApi.update(id, docToSave).catch((e) => {
                      console.error('Lưu layout thất bại:', e);
                    });
                  }
                }
              }}
              onSetBackgroundColor={(color: string) => {
                 handleSetBackgroundColor(color);
                 useEditorStore.setState({ isDirty: true });
              }}
              onSetGlobalFont={(font: string) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                useEditorStore.setState({ globalFont: font, isDirty: true });
                
                // Lưu ngay lập tức
                if (id) {
                  const { nodes: currentNodes, edges: currentEdges, relationships, summaries } = useEditorStore.getState();
                  if (isGuest) {
                    saveGuestDoc(id, name, currentNodes, currentEdges, relationships, summaries);
                  } else if (isAuthed) {
                    const docToSave = { name, content: { nodes: currentNodes, edges: currentEdges, relationships, summaries } };
                    mindmapsApi.update(id, docToSave).catch((e) => {
                      console.error('Lưu font thất bại:', e);
                    });
                  }
                }
              }}
              onSetBranchLineWidth={(width: number) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                useEditorStore.setState({ branchLineWidth: width, isDirty: true });
                
                // Lưu ngay lập tức
                if (id) {
                  const { nodes: currentNodes, edges: currentEdges, relationships, summaries } = useEditorStore.getState();
                  if (isGuest) {
                    saveGuestDoc(id, name, currentNodes, currentEdges, relationships, summaries);
                  } else if (isAuthed) {
                    const docToSave = { name, content: { nodes: currentNodes, edges: currentEdges, relationships, summaries } };
                    mindmapsApi.update(id, docToSave).catch((e) => {
                      console.error('Lưu độ dày dây thất bại:', e);
                    });
                  }
                }
              }}
              onSetGlobalBranchColor={handleSetGlobalBranchColor}
              onSetActiveColorTheme={(themeName: keyof typeof colorThemes) => {
                pushHistory(useEditorStore.getState().nodes, useEditorStore.getState().edges);
                setGlobalStore({ activeColorThemeId: themeName });
                setBackgroundColor(colorThemes[themeName as keyof typeof colorThemes].background);
                useEditorStore.setState({ backgroundColor: colorThemes[themeName as keyof typeof colorThemes].background, isDirty: true });
                
                // Lưu ngay lập tức
                if (id) {
                  const { nodes: currentNodes, edges: currentEdges, relationships, summaries } = useEditorStore.getState();
                  if (isGuest) {
                    saveGuestDoc(id, name, currentNodes, currentEdges, relationships, summaries);
                  } else if (isAuthed) {
                    const docToSave = { name, content: { nodes: currentNodes, edges: currentEdges, relationships, summaries } };
                    mindmapsApi.update(id, docToSave).catch((e) => {
                      console.error('Lưu theme thất bại:', e);
                    });
                  }
                }
              }}
              
              onUpdateNode={handleUpdateNode}
              onApplyQuickStyle={handleApplyQuickStyle}
              onCopyStyle={handleCopyStyle}
              onPasteStyle={handlePasteStyle}
              onResetStyle={handleResetStyle}
              onLayoutAll={() => {
                handleRebalanceLayout();
                setTimeout(() => handleFitToScreen(), 100);
              }}
              
              onToggleColoredBranch={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
