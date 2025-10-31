import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { isEqual } from "lodash";
import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData, NodeStyle } from '../../../core/types'; // Import từ file types chung

// --- Types Definition ---

type Snapshot = { nodes: NodeData[]; edges: EdgeData[] };
const MAX_HISTORY = 50; // User Story #11

// --- Store State ---
type State = {
    nodes: NodeData[];
    edges: EdgeData[];
    _history: Snapshot[]; // Undo stack
    _future: Snapshot[];  // Redo stack
    selectedNodeId: string | null;
    isInitialized: boolean;
    isDragging: boolean;
    // Thêm version để hỗ trợ optimistic locking (#44, #45)
    version: number;
};

// --- Store Actions ---
type Actions = {
    initializeGraph: (nodes: NodeData[], edges: EdgeData[], version: number) => void;
    setGraph: (nodes: NodeData[], edges: EdgeData[], options?: { pushToHistory?: boolean, clearFuture?: boolean }) => void;
    setSelectedNodeId: (nodeId: string | null) => void;
    setIsDragging: (isDragging: boolean) => void;
    setVersion: (version: number) => void;

    _pushHistory: (snapshot: Snapshot) => void;
    undo: () => void; // User Story #11
    redo: () => void; // User Story #11

    addNodeAndEdge: (node: NodeData, edge?: EdgeData) => void; // User Story #10, #11
    updateNodePosition: (nodeId: string, x: number, y: number, isFinal: boolean) => void; // User Story #10
    updateNodeText: (nodeId: string, text: string) => void; // User Story #8
    updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void; // User Story #14, #15
    deleteNodeAndDescendants: (nodeId: string) => string | null; // User Story #9
    toggleNodeCollapse: (nodeId: string) => void; // User Story #16
    updateNodeDimensions: (nodeId: string, width: number, height: number) => void; // Hỗ trợ UI
    reparentNode: (nodeId: string, newParentId: string | null, newPosition: { x: number, y: number }) => boolean; // Hỗ trợ Kéo thả

    // --- Actions cho Realtime (Placeholder) ---
    // applyRealtimeUpdate: (updateData: any) => void; // User Story #20
};

// --- Store Implementation ---
export const useEditorStore = create<State & Actions>()(
    immer(
        persist(
            (set, get) => ({
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
                    // Đảm bảo node root tồn tại (User Story #9)
                    let rootNodeExists = nodes.some(n => n.id === 'root');
                    if (!rootNodeExists) {
                         const potentialRoot = nodes.find(n => !n.parentId);
                         if(potentialRoot) potentialRoot.id = 'root';
                         else nodes.unshift({ id: 'root', text: 'Chủ đề chính', x: 0, y: 0 });
                    }
                    const snapshot = { nodes, edges };
                    set(state => {
                        state.nodes = nodes;
                        state.edges = edges;
                        state.version = version;
                        state._history = [snapshot]; // Bắt đầu history
                        state._future = [];
                        state.selectedNodeId = 'root';
                        state.isInitialized = true;
                        state.isDragging = false;
                    });
                },

                setGraph: (nodes, edges, options = { pushToHistory: true, clearFuture: true }) => {
                    const { pushToHistory = true, clearFuture = true } = options;
                    if (!get().isInitialized) return; // Đợi initializeGraph

                    const previousSnapshot = get()._history[get()._history.length - 1] || { nodes: [], edges: [] };
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
                        if (state._history.length > 0 && isEqual(state._history[state._history.length - 1], snapshot)) return;
                        state._history.push(snapshot);
                        if (state._history.length > MAX_HISTORY + 1) {
                            state._history.shift();
                        }
                    });
                },

                undo: () => { // User Story #11
                    const history = get()._history;
                    if (history.length <= 1) return; // Giữ state ban đầu

                    const current = history[history.length - 1];
                    const previous = history[history.length - 2];

                    set(state => {
                        state.nodes = previous.nodes;
                        state.edges = previous.edges;
                        state._history.pop();
                        state._future.unshift(current);
                        if (!previous.nodes.find(n => n.id === state.selectedNodeId)) {
                            state.selectedNodeId = 'root';
                        }
                    });
                },

                redo: () => { // User Story #11
                    const future = get()._future;
                    if (future.length === 0) return;

                    const next = future[0];
                    set(state => {
                        state.nodes = next.nodes;
                        state.edges = next.edges;
                        state._history.push(next);
                        state._future.shift();
                        if (!next.nodes.find(n => n.id === state.selectedNodeId)) {
                            state.selectedNodeId = 'root';
                        }
                    });
                },

                clearHistory: () => {
                     set(state => {
                        const currentState = state._history[state._history.length - 1] || { nodes: state.nodes, edges: state.edges };
                        state._history = [currentState];
                        state._future = [];
                     });
                },

                addNodeAndEdge: (node, edge) => {
                    get()._pushHistory({ nodes: get().nodes, edges: get().edges });
                    set(state => {
                        state.nodes.push(node);
                        if (edge) state.edges.push({ ...edge, id: edge.id || uuidv4() });
                        state.selectedNodeId = node.id; // User Story #33
                        state._future = [];
                    });
                },

                updateNodePosition: (nodeId, x, y, isFinal) => {
                     // History được xử lý bởi onDragStart/End trong MindmapStage
                     set(state => {
                        const node = state.nodes.find(n => n.id === nodeId);
                        if (node) {
                            node.x = x;
                            node.y = y;
                        }
                        if (isFinal) state._future = [];
                    });
                },

                updateNodeText: (nodeId, text) => { // User Story #8
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

                 updateNodeStyle: (nodeId, style) => { // User Story #14, #15
                    get()._pushHistory({ nodes: get().nodes, edges: get().edges });
                    set(state => {
                        const node = state.nodes.find(n => n.id === nodeId);
                        if (node) {
                            // Ghi đè style, gán undefined nếu value là undefined (để xóa override)
                            if (!node.style) node.style = {};
                            Object.assign(node.style, style);
                            // Xóa key nếu value là undefined
                             Object.keys(style).forEach(key => {
                                if (style[key as keyof NodeStyle] === undefined) {
                                    delete node.style![key as keyof NodeStyle];
                                }
                            });
                        }
                        state._future = [];
                    });
                },

                deleteNodeAndDescendants: (nodeId) => { // User Story #9
                    if (nodeId === 'root') return null;

                    const { nodes, edges } = get();
                    const nodeToDelete = nodes.find(n => n.id === nodeId);
                    if (!nodeToDelete) return null;

                    get()._pushHistory({ nodes, edges }); // Lưu state trước khi xóa

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
                    
                    const finalNodes = get().nodes;
                    return finalNodes.some(n => n.id === parentId) ? parentId : null;
                },

                toggleNodeCollapse: (nodeId) => { // User Story #16
                    get()._pushHistory({ nodes: get().nodes, edges: get().edges });
                    set(state => {
                        const node = state.nodes.find(n => n.id === nodeId);
                        if (node) {
                            node.collapsed = !node.collapsed;
                        }
                        state._future = [];
                    });
                },

                updateNodeDimensions: (nodeId, width, height) => {
                    // Cập nhật UI, không cần lưu history
                    set(state => {
                        const node = state.nodes.find(n => n.id === nodeId);
                        if (node) {
                            node.width = width;
                            node.height = height;
                        }
                    });
                },

                reparentNode: (nodeId, newParentId, newPosition) => { // User Story #10
                    const { nodes, edges } = get();
                    const nodeToMove = nodes.find(n => n.id === nodeId);
                    if (!nodeToMove || nodeId === 'root' || newParentId === nodeId) return false;

                    const isDescendant = (startNodeId: string, targetNodeId: string): boolean => {
                         if (startNodeId === targetNodeId) return true;
                         const children = edges.filter(e => e.from === startNodeId).map(e => e.to);
                         return children.some(childId => isDescendant(childId, targetNodeId));
                     };
                     if (newParentId && isDescendant(nodeId, newParentId)) {
                        console.error("Circular dependency detected: Cannot move node into its own descendant.");
                        return false;
                     }

                    get()._pushHistory({ nodes, edges }); // Lưu history

                    set(state => {
                         const node = state.nodes.find(n => n.id === nodeId);
                         if (!node) return;
                         node.x = newPosition.x;
                         node.y = newPosition.y;
                         state.edges = state.edges.filter(edge => edge.to !== nodeId); // Xóa edge cũ
                         if (newParentId) {
                             node.parentId = newParentId;
                             state.edges.push({ id: uuidv4(), from: newParentId, to: nodeId }); // Thêm edge mới
                         } else {
                             delete node.parentId; // Trở thành node nổi
                         }
                         state._future = [];
                    });
                    return true;
                },

            }),
            // --- Persist Config (Chỉ dùng cho Guest Mode) ---
            {
                name: 'mindmap-guest-storage-v2', // Key cho localStorage
                storage: createJSONStorage(() => localStorage),
                // Chỉ lưu state chính, không lưu UI state (history, selection)
                partialize: (state) => ({
                    nodes: state.nodes,
                    edges: state.edges,
                 }),
                 // Quan trọng: Chỉ hydrate (load) nếu không có dữ liệu được load từ BE
                 // Logic này sẽ được quản lý trong EditorPage.tsx
                 // skipHydration: true, // Bỏ qua hydration tự động, chúng ta sẽ làm thủ công
            }
        ) // End Persist
    ) // End Immer
);
