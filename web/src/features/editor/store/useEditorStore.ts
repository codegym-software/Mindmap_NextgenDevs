/**
 * Zustand store cho Editor state.
 * Tái cấu trúc từ `app/store/useEditorStore.ts` cũ (bản lỗi).
 * Tuân thủ User Story #11 (Undo/Redo 50 bước) và kiến trúc Hybrid.
 */
import { create } from "zustand";
import { immer } from 'zustand/middleware/immer';
import { isEqual } from "lodash";
import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData, NodeStyle } from '../../../core/types';

// --- Types ---
type Snapshot = { nodes: NodeData[]; edges: EdgeData[] };
const MAX_HISTORY = 50; // Yêu cầu là 50 bước

// --- State ---
type State = {
    nodes: NodeData[];
    edges: EdgeData[];
    _history: Snapshot[]; // Undo stack
    _future: Snapshot[]; // Redo stack
    selectedNodeId: string | null;
    isInitialized: boolean;
    isDragging: boolean;
    version: number;
};

// --- Actions ---
type Actions = {
    initializeGraph: (nodes: NodeData[], edges: EdgeData[], version: number) => void;
    setGraph: (nodes: NodeData[], edges: EdgeData[], options?: { pushToHistory?: boolean, clearFuture?: boolean }) => void;
    setSelectedNodeId: (nodeId: string | null) => void;
    setIsDragging: (isDragging: boolean) => void;
    setVersion: (version: number) => void;
   
    _pushHistory: (snapshot: Snapshot) => void;
    undo: () => void;
    redo: () => void;
   
    addNodeAndEdge: (node: NodeData, edge?: EdgeData) => void;
    updateNodePosition: (nodeId: string, x: number, y: number, isFinal: boolean) => void;
    updateNodeText: (nodeId: string, text: string) => void;
    updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;
    deleteNodeAndDescendants: (nodeId: string) => string | null;
    toggleNodeCollapse: (nodeId: string) => void;
    updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
    reparentNode: (nodeId: string, newParentId: string | null, newPosition: { x: number, y: number }) => boolean;
};

// --- Store Implementation ---
export const useEditorStore = create<State & Actions>()(
    immer((set, get) => ({
        // --- Initial State ---
        nodes: [],
        edges: [],
        _history: [],
        _future: [],
        selectedNodeId: null,
        isInitialized: false,
        isDragging: false,
        version: 0,

        // --- Actions ---
        initializeGraph: (nodes, edges, version) => {
            let rootNodeExists = nodes.some(n => n.id === 'root');
            if (!rootNodeExists) {
                const potentialRoot = nodes.find(n => !n.parentId);
                if (potentialRoot) potentialRoot.id = 'root';
                else nodes.unshift({ id: 'root', text: 'Chủ đề chính', x: 0, y: 0, level: 0, width: 150, height: 40, descendantCount: 0 });
            }
            const snapshot = { nodes, edges };
            set(state => {
                state.nodes = nodes;
                state.edges = edges;
                state.version = version;
                state._history = [snapshot];
                state._future = [];
                state.selectedNodeId = 'root';
                state.isInitialized = true;
            });
        },

        setGraph: (nodes, edges, options = { pushToHistory: true, clearFuture: true }) => {
            const { pushToHistory = true, clearFuture = true } = options;
            if (!get().isInitialized) {
                get().initializeGraph(nodes, edges, 0); // Khởi tạo nếu chưa
                return;
            }
            const previousSnapshot = get()._history[get()._history.length - 1];
            const newSnapshot = { nodes, edges };
           
            if (!isEqual(previousSnapshot, newSnapshot)) {
                set(state => {
                    state.nodes = nodes;
                    state.edges = edges;
                    if (clearFuture) state._future = [];
                });
                if (pushToHistory) get()._pushHistory(newSnapshot);
            }
        },

        setSelectedNodeId: (nodeId) => set(state => { state.selectedNodeId = nodeId; }),
        setIsDragging: (isDragging) => set(state => { state.isDragging = isDragging; }),
        setVersion: (version) => set(state => { state.version = version; }),

        _pushHistory: (snapshot) => {
            set(state => {
                if (isEqual(state._history[state._history.length - 1], snapshot)) return;
                state._history.push(snapshot);
                if (state._history.length > MAX_HISTORY + 1) { // +1 for initial state
                    state._history.shift();
                }
            });
        },

        undo: () => {
            const history = get()._history;
            if (history.length <= 1) return; // Không undo state ban đầu
           
            const current = history[history.length - 1];
            const previous = history[history.length - 2];
           
            set(state => {
                state.nodes = previous.nodes;
                state.edges = previous.edges;
                state._history.pop();
                state._future.unshift(current);
                if (!previous.nodes.find(n => n.id === state.selectedNodeId)) {
                    state.selectedNodeId = previous.nodes.find(n => !n.parentId)?.id || null;
                }
            });
        },

        redo: () => {
            const future = get()._future;
            if (future.length === 0) return;
            const next = future[0];
            set(state => {
                state.nodes = next.nodes;
                state.edges = next.edges;
                state._history.push(next);
                state._future.shift();
                if (!next.nodes.find(n => n.id === state.selectedNodeId)) {
                    state.selectedNodeId = next.nodes.find(n => !n.parentId)?.id || null;
                }
            });
        },
       
        // Logic actions (add, update, delete...)
       
        addNodeAndEdge: (node, edge) => {
            get()._pushHistory({ nodes: get().nodes, edges: get().edges });
            set(state => {
                state.nodes.push(node);
                if (edge) state.edges.push({ ...edge, id: edge.id || uuidv4() });
                state.selectedNodeId = node.id;
                state._future = [];
            });
        },

        updateNodePosition: (nodeId, x, y, isFinal) => {
            // isFinal = true: onDragEnd (lưu history)
            // isFinal = false: onDragMove (không lưu history)
            if (isFinal) {
                // Chỉ lưu history nếu vị trí thực sự thay đổi
                const oldNode = get().nodes.find(n => n.id === nodeId);
                if (oldNode && (oldNode.x !== x || oldNode.y !== y)) {
                    get()._pushHistory({ nodes: get().nodes, edges: get().edges });
                }
            }
           
            set(state => {
                const node = state.nodes.find(n => n.id === nodeId);
                if (node) {
                    node.x = x;
                    node.y = y;
                }
                if (isFinal) state._future = [];
            });
        },

        updateNodeText: (nodeId, text) => {
            const currentNodes = get().nodes;
            const node = currentNodes.find(n => n.id === nodeId);
            if (node && node.text !== text) {
                get()._pushHistory({ nodes: currentNodes, edges: get().edges });
                set(state => {
                    const nodeToUpdate = state.nodes.find(n => n.id === nodeId);
                    if (nodeToUpdate) nodeToUpdate.text = text;
                    state._future = [];
                });
            }
        },

        updateNodeStyle: (nodeId, style) => {
            get()._pushHistory({ nodes: get().nodes, edges: get().edges });
            set(state => {
                const node = state.nodes.find(n => n.id === nodeId);
                if (node) {
                    if (!node.style) node.style = {};
                    Object.assign(node.style, style);
                    // Xóa key nếu value là undefined (reset)
                    Object.keys(style).forEach(key => {
                        if (style[key as keyof NodeStyle] === undefined) {
                            delete node.style![key as keyof NodeStyle];
                        }
                    });
                }
                state._future = [];
            });
        },

        deleteNodeAndDescendants: (nodeId) => {
            if (nodeId === 'root') return null;
            const { nodes, edges } = get();
            const nodeToDelete = nodes.find(n => n.id === nodeId);
            if (!nodeToDelete) return null;
            get()._pushHistory({ nodes, edges });
            const nodesToDeleteIds = new Set<string>();
            const q: string[] = [nodeId];
            nodesToDeleteIds.add(nodeId);
            let head = 0;
            while(head < q.length){
                const currentId = q[head++];
                edges.forEach(edge => {
                    if (edge.from === currentId && !nodesToDeleteIds.has(edge.to)) {
                        nodesToDeleteIds.add(edge.to);
                        q.push(edge.to);
                    }
                });
            }
            const parentId = nodeToDelete.parentId || 'root';
            set(state => {
                state.nodes = state.nodes.filter(n => !nodesToDeleteIds.has(n.id));
                state.edges = state.edges.filter(e => !nodesToDeleteIds.has(e.from) && !nodesToDeleteIds.has(e.to));
                state.selectedNodeId = state.nodes.some(n => n.id === parentId) ? parentId : null;
                state._future = [];
            });
            return parentId;
        },

        toggleNodeCollapse: (nodeId) => {
            get()._pushHistory({ nodes: get().nodes, edges: get().edges });
            set(state => {
                const node = state.nodes.find(n => n.id === nodeId);
                if (node) node.collapsed = !node.collapsed;
                state._future = [];
            });
        },

        updateNodeDimensions: (nodeId, width, height) => {
            set(state => {
                const node = state.nodes.find(n => n.id === nodeId);
                if (node) {
                    node.width = width;
                    node.height = height;
                }
            });
        },

        reparentNode: (nodeId, newParentId, newPosition) => {
            const { nodes, edges } = get();
            const nodeToMove = nodes.find(n => n.id === nodeId);
            if (!nodeToMove || nodeId === 'root' || newParentId === nodeId) return false;
            const isDescendant = (startNodeId: string, targetNodeId: string): boolean => {
                 if (startNodeId === targetNodeId) return true;
                 const children = edges.filter(e => e.from === startNodeId).map(e => e.to);
                 return children.some(childId => isDescendant(childId, targetNodeId));
             };
             if (newParentId && isDescendant(nodeId, newParentId)) {
                console.error("Circular dependency detected!");
                return false;
             }
            get()._pushHistory({ nodes, edges });
            set(state => {
                 const node = state.nodes.find(n => n.id === nodeId);
                 if (!node) return;
                 node.x = newPosition.x;
                 node.y = newPosition.y;
                 state.edges = state.edges.filter(edge => edge.to !== nodeId); // Xóa edge cũ
                 if (newParentId) {
                     node.parentId = newParentId;
                     state.edges.push({ id: uuidv4(), from: newParentId, to: nodeId });
                 } else {
                     delete node.parentId;
                 }
                 state._future = [];
            });
            return true;
        },
    }))
);
