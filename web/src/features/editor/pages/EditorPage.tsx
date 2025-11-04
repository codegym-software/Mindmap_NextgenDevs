/**
 * Trang Editor chính (Router #7, #8, #10).
 * Tái cấu trúc từ `pages/Editor.tsx` (code gốc).
 * Tích hợp Lõi Giai đoạn 1 (Stage, Store) và UI (Toolbar, Panel).
 * Quản lý toàn bộ logic, data flow, và phím tắt.
 * Tuân thủ Hybrid: DOM (Editor) + Canvas (Stage) + DOM Overlay (TextEditor).
 */
import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as dagre from 'dagre';
import { debounce } from 'lodash';

// --- Core & Feature Imports ---
import { useAuth } from "../../auth/hooks/useAuth";
import { useToast } from "../../../core/hooks/useToast";
import { useTheme } from "../../../core/hooks/useTheme";
import Spinner from "../../../core/components/Spinner/Spinner";
import Sidebar from "../../../core/layouts/Sidebar";
import Modal from "../../../core/components/Modal/Modal";
import Button from "../../../core/components/Button/Button";
import { MindmapDetailResponse, NodeData, EdgeData } from "../../../core/types";
import { 
    calculateNodeDimensions, 
    getNodeStyle, 
    calculateLevel, 
    formatRelativeDate, 
    downloadTextFile 
} from "../../../core/utils/helpers"; // (Đã tạo)

// --- Editor Specific Imports ---
import EditorToolbar from "../components/Toolbar/EditorToolbar";
import StylePanel from "../components/Panels/StylePanel";
import DisplaySwitcher, { LayoutType } from "../components/ViewOptions/DisplaySwitcher";
import { useEditorStore } from "../store/useEditorStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { mindmapApi } from "../api/mindmapApi"; // (Đã tạo ở GĐ1)
import { useLocalMindmap } from "../../dashboard/hooks/useLocalMindmap"; // (Đã tạo ở GĐ3a)
import Konva from "konva"; // Cần cho Tween

// --- Lazy Load Components ---
const MindmapStage = lazy(() => import('../components/Canvas/MindmapStage'));
const ShareModal = lazy(() => import('../../collaboration/components/ShareModal/ShareModal'));

// --- Logic xử lý Guest Mode (Tái cấu trúc từ `Editor.tsx` gốc) ---
const GUEST_BUCKET = "mm_guest_docs_v2"; // Khớp với hook `useLocalMindmap`

function loadGuestDoc(id: string): MindmapDetailResponse | null {
    try {
        const raw = localStorage.getItem(GUEST_BUCKET);
        const allDocs = raw ? JSON.parse(raw) : {};
        const guestData = allDocs[id];
        if (!guestData) return null;

        // SỬA LỖI HYBRID: Đảm bảo nodes là List
        let nodesArray: NodeData[] = [];
        if (Array.isArray(guestData.content?.nodes)) {
            nodesArray = guestData.content.nodes;
        } else if (typeof guestData.content?.nodes === 'object') {
            nodesArray = Object.values(guestData.content.nodes || {});
        }
        
        // Đảm bảo root node (User Story #9)
        if (nodesArray.length === 0 || !nodesArray.find(n => n.id === 'root')) {
            nodesArray = [{ id: 'root', text: 'Chủ đề chính', x: 0, y: 0, level: 0, width: 150, height: 40, descendantCount: 0 }];
        }

        return {
            id: guestData.id,
            name: guestData.name || "Mindmap Nháp",
            ownerId: "guest",
            content: {
                 nodes: nodesArray,
                 edges: guestData.content?.edges || [],
            },
            createdAt: guestData.createdAt || new Date().toISOString(),
            updatedAt: guestData.updatedAt || new Date().toISOString(),
            version: guestData.version || 0,
            tags: [],
            accessSettings: { isPublic: false, publicAccessLevel: 'DISABLED' },
            collaborators: [],
            workspaceId: null,
            lastEditedBy: "guest",
        };
    } catch (e) {
        console.error("Error loading guest doc:", e);
        return null;
    }
}

function saveGuestDoc(id: string, name: string, nodes: NodeData[], edges: EdgeData[], version: number) {
    try {
        const allDocs = JSON.parse(localStorage.getItem(GUEST_BUCKET) || "{}");
        // SỬA LỖI HYBRID: Lưu `nodes` là List (Array)
        allDocs[id] = {
            id,
            name,
            content: { nodes, edges }, // Lưu nodes là Array
            version: version + 1,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(GUEST_BUCKET, JSON.stringify(allDocs));
    } catch (e) {
        console.error("Error saving guest doc:", e);
        // (Không dùng addToast ở đây vì hàm này chạy trong background)
    }
}


// --- Editor Page Component ---
const EditorPage: React.FC = () => {
    const { id: mindmapId } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const { isAuthed, login } = useAuth();
    const { addToast } = useToast();
    const { toggleTheme } = useTheme();
    const { createGuest } = useLocalMindmap();

    // --- State từ Zustand Store ---
    const {
        nodes, edges, isInitialized, version,
        initializeGraph, setGraph, undo, redo,
        _pushHistory, setSelectedNodeId, setVersion,
        canUndo, canRedo
    } = useEditorStore(state => ({
        nodes: state.nodes,
        edges: state.edges,
        isInitialized: state.isInitialized,
        version: state.version,
        initializeGraph: state.initializeGraph,
        setGraph: state.setGraph,
        undo: state.undo,
        redo: state.redo,
        _pushHistory: state._pushHistory,
        setSelectedNodeId: state.setSelectedNodeId,
        canUndo: state._history.length > 1,
        canRedo: state._future.length > 0,
    }));

    // --- State Cục bộ của Trang ---
    const [mindmapName, setMindmapName] = useState("Đang tải...");
    const [mindmapData, setMindmapData] = useState<MindmapDetailResponse | null>(null); // Giữ data đầy đủ (để share)
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isStylePanelOpen, setIsStylePanelOpen] = useState(false); // User Story #14
    const [isShareModalOpen, setIsShareModalOpen] = useState(false); // User Story #18
    const [isExportModalOpen, setIsExportModalOpen] = useState(false); // User Story #35
    const [currentLayout, setCurrentLayout] = useState<LayoutType>('LR'); // Mặc định Ngang
    
    // SỬA: State editingNodeId phải nằm ở đây (parent của Stage và KeyboardHook)
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    const isGuest = mindmapId?.startsWith("guest-") ?? false;
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const stageRef = useRef<Konva.Stage>(null); // Ref cho MindmapStage (để tính vị trí)

    // --- 1. Data Loading Effect ---
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        const loadData = async () => {
            if (!mindmapId) {
                // Router #7: Tạo mới
                setLoading(true);
                try {
                    if (isAuthed) {
                        const newMap = await mindmapApi.create({ name: "Mindmap Mới" });
                        if (isMounted) navigate(`/editor/${newMap.id}`, { replace: true });
                    } else {
                        // Router #10: Tạo guest map (User Story #36)
                        const newGuestMap = createGuest();
                        if (isMounted) navigate(`/editor/${newGuestMap.id}`, { replace: true });
                    }
                } catch (e) {
                     addToast("Không thể tạo mindmap mới", "error");
                     if (isMounted) navigate("/dashboard");
                }
                return;
            }

            // Router #8: Load map
            try {
                let data: MindmapDetailResponse | null = null;
                if (isGuest) {
                    data = loadGuestDoc(mindmapId); // Logic gốc (đã sửa lỗi Hybrid)
                    if (!data) throw new Error("Không tìm thấy mindmap nháp.");
                } else {
                    // Nếu là map server, phải đăng nhập
                    if (!isAuthed) {
                         addToast("Vui lòng đăng nhập để xem mindmap này.", "info");
                         login('login');
                         setIsLoading(false);
                         return;
                    }
                    data = await mindmapApi.get(mindmapId); // API đã sửa lỗi Hybrid
                }

                if (isMounted) {
                    setMindmapName(data.name);
                    setMindmapData(data); // Lưu data đầy đủ (cho ShareModal)
                    initializeGraph(data.content.nodes, data.content.edges || [], data.version || 0);
                    // Áp dụng layout mặc định khi load
                    handleLayout(currentLayout, data.content.nodes, data.content.edges, false);
                }
            } catch (error: any) {
                if (isMounted) {
                    addToast(`Lỗi tải mindmap: ${error.message || 'Không rõ'}`, "error");
                    navigate("/dashboard", { replace: true });
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mindmapId, isAuthed]); // Chỉ chạy khi ID hoặc Auth thay đổi

    // --- 2. Auto-Saving Effect ---
    // (Sử dụng logic debounce từ code gốc của bạn)
    const debouncedSave = useCallback(debounce((
        currentMindmapId: string, 
        currentName: string, 
        currentNodes: NodeData[], 
        currentEdges: EdgeData[], 
        currentVersion: number
    ) => {
        if (!currentMindmapId || !isInitialized) return;

        const payload = { 
            name: currentName, 
            content: { nodes: currentNodes, edges: currentEdges },
            version: currentVersion
        };

        if (isGuest) {
            saveGuestDoc(currentMindmapId, currentName, currentNodes, currentEdges, currentVersion);
        } else if (isAuthed) {
            setIsSaving(true);
            mindmapApi.update(currentMindmapId, payload)
                .then(response => {
                    setVersion(response.version); // Cập nhật version mới
                })
                .catch(e => {
                    console.error("Autosave failed:", e);
                    addToast("Lưu tự động thất bại (có thể do xung đột)", "error");
                    // TODO: Xử lý 409 Conflict
                })
                .finally(() => setIsSaving(false));
        }
    }, 1500), [isGuest, isAuthed, isInitialized]); // 1.5 giây

    useEffect(() => {
        // Chỉ auto-save khi đã load xong và có thay đổi (history > 1)
        if (isInitialized && mindmapId) {
            // (Kiểm tra history > 1 là không cần thiết,
            // vì `nodes`, `edges` thay đổi là đủ)
            debouncedSave(mindmapId, mindmapName, nodes, edges, version);
        }
    }, [nodes, edges, mindmapName, mindmapId, isInitialized, version, debouncedSave]);

    // --- 3. Action Handlers (truyền xuống Toolbar) ---
    
    // Lưu thủ công (User Story #35)
    const handleSaveMindmap = useCallback(() => {
        debouncedSave.flush(); // Lưu ngay lập tức
        if (!isSaving) addToast("Đã lưu!", "success");
    }, [debouncedSave, isSaving, addToast]);

    // Lưu tên (từ Toolbar input)
    const handleSaveName = useCallback((newName: string) => {
        setMindmapName(newName); // State local thay đổi sẽ trigger auto-save
    }, []);

    // Chia sẻ (User Story #18)
    const handleShare = useCallback(() => {
        if (isGuest) {
            addToast("Vui lòng đăng nhập để chia sẻ mindmap.", "info");
            login('login');
            return;
        }
        setItemToShare(mindmapData); // mindmapData đã đầy đủ
        setIsShareModalOpen(true);
    }, [isGuest, login, addToast, mindmapData]);

    // Export (User Story #35)
    const handleExport = useCallback(() => {
        setIsExportModalOpen(true);
    }, []);

    // --- 4. Layouting Logic (User Story #10) ---
    const handleLayout = useCallback((
        layoutType: LayoutType,
        nodesToLayout = useEditorStore.getState().nodes,
        edgesToLayout = useEditorStore.getState().edges,
        pushToHistory = true
    ) => {
        if (nodesToLayout.length <= 1) return;
        if (layoutType === 'RADIAL') {
             addToast("Layout Tỏa tròn đang phát triển", "info");
             return;
        }

        const g = new dagre.graphlib.Graph<{}>();
        const direction = layoutType === 'LR' ? 'LR' : 'TB';
        g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 120 });
        g.setDefaultEdgeLabel(() => ({}));

        const nodeMap = new Map(nodesToLayout.map(n => [n.id, n]));
        nodesToLayout.forEach(node => {
            // (Sử dụng logic tính toán từ code gốc `Editor.tsx`)
            const level = calculateLevel(node.id, nodeMap);
            const style = getNodeStyle(level);
            const finalStyle = { ...style, ...(node.style || {}) };
            const { width, height } = calculateNodeDimensions(node.text, finalStyle);
            
            // Cập nhật W/H vào node (quan trọng cho layout)
            const nodeInMap = nodeMap.get(node.id);
            if (nodeInMap) { nodeInMap.width = width; nodeInMap.height = height; }
            
            g.setNode(node.id, { label: node.text, width, height });
        });
        edgesToLayout.forEach(edge => {
             if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
                 g.setEdge(edge.from, edge.to);
             }
        });

        try {
            dagre.layout(g);
            if(pushToHistory) _pushHistory({ nodes: nodesToLayout, edges: edgesToLayout });

            const newNodes = nodesToLayout.map(n => {
                const layoutNode = g.node(n.id);
                const nodeFromMap = nodeMap.get(n.id);
                return (layoutNode && nodeFromMap) ? { ...nodeFromMap, x: layoutNode.x, y: layoutNode.y } : n;
            });

            setGraph(newNodes, edgesToLayout, { pushToHistory: false, clearFuture: true });
            setCurrentLayout(layoutType);
            if(pushToHistory) addToast(`Đã áp dụng layout!`, "success");

            // Căn giữa view (User Story #12)
            const rootNode = newNodes.find(n => n.id === 'root');
            const stage = stageRef.current;
            if (rootNode && stage) {
                 const newScale = 1; // Reset zoom
                 setStageScale(newScale);
                 const targetX = stageSize.width / 2 - rootNode.x * newScale;
                 const targetY = stageSize.height / 3 - rootNode.y * newScale;
                 new Konva.Tween({ node: stage, duration: 0.5, x: targetX, y: targetY, easing: Konva.Easings.EaseInOut }).play();
                 setStagePos({ x: targetX, y: targetY });
            }
        } catch (layoutError) {
             console.error("Dagre layout failed:", layoutError);
             addToast("Không thể áp dụng layout.", "error");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_pushHistory, setGraph, addToast, stageSize, currentLayout]);


    // --- 5. Keyboard Shortcuts Hook (User Story #6, #7, #8, #9, #11) ---
    useKeyboardShortcuts(
        (nodeId) => setEditingNodeId(nodeId), // startEditing
        !!editingNodeId, // isEditing
        handleSaveMindmap,
        () => setIsStylePanelOpen(prev => !prev),
        () => handleLayout(currentLayout), // Layout
        !isShareModalOpen && !isExportModalOpen // isEnabled
    );
    
    // --- 6. Export Text Logic (User Story #35) ---
    const exportTextContent = useMemo(() => {
         const nodeMap = new Map(nodes.map(n => [n.id, n]));
         const adj = new Map<string, string[]>();
         edges.forEach(e => {
             if (!adj.has(e.from)) adj.set(e.from, []);
             adj.get(e.from)!.push(e.to);
         });
         let text = "";
         const dfs = (nodeId: string, depth: number) => {
             const node = nodeMap.get(nodeId);
             if (!node) return;
             text += `${"  ".repeat(depth)}- ${node.text || '(Trống)'}\n`;
             const children = adj.get(nodeId) || [];
             children.forEach(childId => dfs(childId, depth + 1));
         };
         // SỬA: Chỉ bắt đầu từ root
         const rootNode = nodes.find(n => n.id === 'root');
         if(rootNode) dfs(rootNode.id, 0);
         // (Thêm các node nổi khác nếu cần)
         return text;
    }, [nodes, edges]);

    const handleDownloadText = () => {
         downloadTextFile(mindmapName || 'mindmap', exportTextContent);
         setIsExportModalOpen(false);
    };

    // --- Render ---
    if (isLoading || !isInitialized) {
        return (
            <div className="w-screen h-screen bg-gray-900 flex items-center justify-center text-white">
                <Spinner size="lg" />
            </div>
        );
    }

    // (Giữ nguyên 100% UI gốc của bạn cho `Editor.tsx`)
    // SỬA: Tích hợp logic và props vào UI gốc
    return (
        <div className="w-screen h-screen bg-gray-900 dark:bg-gray-950 overflow-hidden flex flex-col">
            <EditorToolbar
                name={mindmapName}
                onNameChange={setMindmapName} // SỬA: Cập nhật state local
                onCommitName={() => handleSaveName(mindmapName)} // SỬA: Trigger save
                onHomeClick={() => navigate("/dashboard")}
                onUndo={undo}
                canUndo={canUndo}
                onRedo={redo}
                canRedo={canRedo}
                onSave={handleSaveMindmap}
                isSaving={isSaving}
                onExport={handleExport}
                onShare={handleShare}
                onToggleStylePanel={() => setIsStylePanelOpen(prev => !prev)}
            />
            
            <Sidebar />

            {/* SỬA: Thay đổi `pt-14` và `md:pl-72` để khớp layout mới */}
            <main className="flex-1 pt-14 relative md:pl-72"> {/* pl-72 khớp với width của Sidebar */}
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400"><Spinner /> Đang tải Canvas...</div>}>
                    {/* SỬA: Truyền props (từ logic `Editor.tsx` gốc) vào Stage */}
                    <MindmapStage
                        stageRef={stageRef}
                        stagePos={stagePos}
                        setStagePos={setStagePos}
                        stageScale={stageScale}
                        setStageScale={setStageScale}
                        editingNodeId={editingNodeId}
                        onStartEditing={setEditingNodeId}
                        onStopEditing={handleStopEditing}
                    />
                </Suspense>

                {/* SỬA: Truyền props cho StylePanel (từ code gốc `FormattingToolbar`) */}
                <StylePanel 
                    isOpen={isStylePanelOpen} 
                    onClose={() => setIsStylePanelOpen(false)} 
                />

                {/* SỬA: Truyền props cho DisplaySwitcher (từ code gốc `DisplaySwitcher`) */}
                <DisplaySwitcher 
                    onPick={handleLayout}
                    currentLayout={currentLayout}
                />
            </main>

            {/* SỬA: Tái cấu trúc Modals (từ logic GĐ3b) */}
            <Suspense>
                {isShareModalOpen && mindmapData && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        mindmap={mindmapData}
                        onSettingsChange={(newSettings) => {
                             setMindmapData(prev => prev ? ({ ...prev, accessSettings: newSettings }) : null);
                             // Cập nhật store dashboard (nếu cần)
                             useMindmapsStore.getState().updateItemAccess(mindmapData.id, newSettings);
                        }}
                    />
                )}
            </Suspense>
            
            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Xuất Mindmap (User Story #35)">
                 <label className="text-sm font-medium text-gray-400">Xem trước (dạng Text)</label>
                 <textarea
                     readOnly
                     value={exportTextContent}
                     className="w-full h-48 bg-gray-900 border border-gray-700 rounded-md p-2 mt-1 text-gray-200 text-sm font-mono"
                 />
                 <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Đóng</Button>
                    <Button onClick={handleDownloadText}>Tải về file .txt</Button>
                 </div>
            </Modal>
        </div>
    );
};

export default EditorPage;

