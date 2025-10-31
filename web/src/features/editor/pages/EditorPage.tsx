// ... (imports)
import EditorToolbar from '../components/Toolbar/EditorToolbar';
// ... (rest of imports)

// ... (Helper Functions)

// --- Editor Page Component ---
const EditorPage: React.FC = () => {
    // ... (state, effects, handlers)
    // ...
    // (Bao gồm handleSaveMindmap, handleToggleStylePanel, handleLayout, handleStartEditing)
    // ...

    // --- 4. Layouting Logic ---
    const handleLayout = useCallback((
        layoutType: LayoutType,
        nodesToLayout = useEditorStore.getState().nodes, // Lấy state mới nhất
        edgesToLayout = useEditorStore.getState().edges,
        pushToHistory = true
    ) => {
        // ... (logic layout không đổi)
        if (nodesToLayout.length <= 1) return;
        if (layoutType === 'RADIAL') {
             addToast("Layout Tỏa tròn đang phát triển", "info");
             return;
        }

        const g = new dagre.graphlib.Graph<{}>();
        const direction = layoutType === 'LR' ? 'LR' : 'TB';
        g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 100 });
        g.setDefaultEdgeLabel(() => ({}));

        const nodeMap = new Map(nodesToLayout.map(n => [n.id, n]));
        nodesToLayout.forEach(node => {
             const level = calculateLevel(node.id, nodeMap); // Bỏ qua `allNodes`
             const style = getNodeStyle(level);
             const { width, height } = calculateNodeDimensions(node.text, style);
             // Cập nhật lại width/height trong node (nếu chưa có)
             // (Node.tsx cũng làm việc này, nhưng làm ở đây đảm bảo layout chính xác)
             const nodeInMap = nodeMap.get(node.id);
             if (nodeInMap) {
                 nodeInMap.width = width;
                 nodeInMap.height = height;
             }
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
                const nodeFromMap = nodeMap.get(n.id); // Lấy node đã cập nhật width/height
                return (layoutNode && nodeFromMap) ? { ...nodeFromMap, x: layoutNode.x, y: layoutNode.y } : n;
            });

            setGraph(newNodes, edgesToLayout, { pushToHistory: false, clearFuture: true });
            setCurrentLayout(layoutType);
            if(pushToHistory) addToast(`Đã áp dụng layout!`, "success");

            // Căn giữa view sau khi layout
            const rootNode = newNodes.find(n => n.id === 'root');
            const stage = stageRef.current;
            if (rootNode && stage) {
                 const newScale = 1;
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
    }, [_pushHistory, setGraph, addToast, stageSize, currentLayout]); // Bỏ nodes, edges


    // Khởi tạo phím tắt
    useKeyboardShortcuts(
        handleStartEditing,
        handleSaveMindmap,
        handleToggleStylePanel,
        () => handleLayout(currentLayout),
        !editingNodeId && !isShareModalOpen && !isExportModalOpen
    );

    // ... (Export text logic) ...

    // --- Render Logic ---
    if (isLoading && !isInitialized) {
        // ... (loading spinner)
    }

    return (
        <div className="w-screen h-screen flex flex-col bg-gray-900 overflow-hidden">
            <EditorToolbar
                initialName={mindmapName}
                onSaveName={handleSaveName}
                onShare={() => setIsShareModalOpen(true)}
                onSaveMindmap={handleSaveMindmap}
                onExport={() => setIsExportModalOpen(true)} // Kết nối nút Export
                onToggleStylePanel={handleToggleStylePanel}
            />
            {/* ... (rest of JSX: main, Suspense, MindmapStage, StylePanel, DisplaySwitcher, Modals) ... */}
            
            <main className="flex-1 pt-14 relative">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400"><Spinner /> Đang tải Canvas...</div>}>
                    <MindmapStage />
                </Suspense>
                <StylePanel isOpen={isStylePanelOpen} onClose={handleToggleStylePanel} />
                <DisplaySwitcher onLayoutChange={handleLayout} currentLayout={currentLayout} />
            </main>

            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Chia sẻ Mindmap">
                 <p className="text-gray-300 mb-4">
                    Tính năng chia sẻ chi tiết (mời email, đặt quyền) đang được phát triển.
                 </p>
                 <label className="text-sm font-medium text-gray-400">Link chia sẻ công khai</label>
                 <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/share/${mindmapId}`}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 mt-1 text-gray-200"
                    onFocus={(e) => e.target.select()}
                 />
                 <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>Đóng</Button>
                    <Button onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${mindmapId}`);
                        addToast("Đã sao chép link!", "success");
                        setIsShareModalOpen(false);
                    }}>
                        Sao chép Link
                    </Button>
                 </div>
            </Modal>
            
            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Xuất Mindmap">
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
