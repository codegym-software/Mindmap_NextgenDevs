import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '../../store/useEditorStore';
import { NodeData, EdgeData } from '../../../../core/types'; // Import từ core
import Node from './Node';
import Edge from './Edge';
import InlineTextEditor from './InlineTextEditor';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_WIDTH = window.innerWidth;
const DEFAULT_HEIGHT = window.innerHeight - 56; // 56px toolbar

const MindmapStage: React.FC = () => {
    const stageRef = useRef<Konva.Stage>(null);

    // --- Lấy State và Actions từ Zustand Store ---
    const {
        nodes, edges, selectedNodeId, isInitialized,
        setSelectedNodeId, updateNodePosition, addNodeAndEdge,
        toggleNodeCollapse, _pushHistory, reparentNode,
        deleteNodeAndDescendants // Thêm action xóa
    } = useEditorStore();

    // --- State Cục bộ cho UI/Canvas ---
    const [stageSize, setStageSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
    const [stagePos, setStagePos] = useState({ x: DEFAULT_WIDTH / 2, y: DEFAULT_HEIGHT / 3 });
    const [stageScale, setStageScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false); // Pan bằng chuột
    const lastDist = useRef(0); // Cho pinch zoom
    const isTouchPanning = useRef(false); // Pan bằng touch

    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // State cho Drag & Drop (Reparenting)
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [dragStartState, setDragStartState] = useState<ReturnType<typeof useEditorStore.getState> | null>(null);


    // --- Effects ---

    // Xử lý resize cửa sổ
    useEffect(() => {
        const handleResize = () => {
            setStageSize({ width: window.innerWidth, height: window.innerHeight - 56 });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Tự động căn giữa view vào node được chọn
     useEffect(() => {
         if (!isInitialized || isPanning || isDragging) return; // Không căn giữa khi đang pan hoặc drag
         
         const targetNodeId = selectedNodeId || 'root';
         const node = nodes.find(n => n.id === targetNodeId);
         const stage = stageRef.current;
         if (node && stage) {
             const targetX = stageSize.width / 2 - node.x * stageScale;
             const targetY = stageSize.height / 3 - node.y * stageScale; // Focus hơi cao một chút

             new Konva.Tween({
                 node: stage,
                 duration: 0.3, // 300ms
                 x: targetX,
                 y: targetY,
                 easing: Konva.Easings.EaseInOut,
             }).play();
         }
     }, [selectedNodeId, isInitialized, isPanning, isDragging, nodes, stageScale, stageSize]);


    // --- Tính toán dữ liệu Render (Memoized) ---
    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

    // Hàm đệ quy kiểm tra node có bị ẩn do cha bị collapse không
    const isNodeVisible = useCallback((nodeId: string): boolean => {
        const node = nodeMap.get(nodeId);
        if (!node) return false;
        if (!node.parentId) return true; // Node gốc hoặc node nổi luôn hiện
        const parent = nodeMap.get(node.parentId);
        if (!parent) return true; // Node mồ côi (lỗi dữ liệu)
        if (parent.collapsed) return false; // Cha bị đóng -> Ẩn
        return isNodeVisible(node.parentId); // Kiểm tra lên ông bà
    }, [nodeMap]);

    const visibleNodes = useMemo(() => nodes.filter(n => isNodeVisible(n.id)), [nodes, isNodeVisible]);
    const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
    const visibleEdges = useMemo(() => edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)), [edges, visibleNodeIds]);
    const nodesWithChildren = useMemo(() => new Set(edges.map(e => e.from)), [edges]);
    
    // Tính số lượng con cháu (descendant) cho nút collapse (User Story #16)
    const descendantCounts = useMemo(() => {
        const counts = new Map<string, number>();
        const adj = new Map<string, string[]>();
        edges.forEach(edge => {
            if (!adj.has(edge.from)) adj.set(edge.from, []);
            adj.get(edge.from)!.push(edge.to);
        });
        const dfs = (nodeId: string): number => {
            const children = adj.get(nodeId) || [];
            return children.length + children.reduce((sum, childId) => sum + dfs(childId), 0);
        };
        nodes.forEach(node => counts.set(node.id, dfs(node.id)));
        return counts;
    }, [nodes, edges]);


    // --- Stage Interaction Handlers (User Story #12, #13) ---

    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const scaleBy = 1.08;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        const direction = e.evt.deltaY < 0 ? 1 : -1;
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(0.15, Math.min(newScale, 3.0)); // Giới hạn zoom

        setStageScale(newScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    }, []);

     const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (editingNodeId) { // Nếu đang edit, click ra ngoài
            const editor = document.querySelector(`textarea[data-node-id="${editingNodeId}"]`) as HTMLTextAreaElement | null;
            editor?.blur(); // Trigger blur (lưu)
        }
        if (e.target === stageRef.current) setSelectedNodeId(null); // Bỏ chọn

        const isTouchEvent = e.evt instanceof TouchEvent;
        const isMiddleButton = e.evt instanceof MouseEvent && e.evt.button === 1;
        const isSpaceDrag = e.evt instanceof MouseEvent && e.evt.buttons === 1 && e.evt.ctrlKey; // Giả sử Ctrl+Click
        const isBackground = e.target === stageRef.current;

        if (isMiddleButton || (isBackground && !isTouchEvent) || isSpaceDrag) {
             setIsPanning(true);
             stageRef.current?.container().style.cursor = 'grabbing';
         } else if (isBackground && isTouchEvent && e.evt.touches.length === 1) {
             isTouchPanning.current = true;
             const touch = e.evt.touches[0];
             stageRef.current?.setAttr('lastClientX', touch.clientX);
             stageRef.current?.setAttr('lastClientY', touch.clientY);
         }
    }, [editingNodeId, setSelectedNodeId]);

    const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isPanning || !(e.evt instanceof MouseEvent)) return;
        setStagePos(prevPos => ({
            x: prevPos.x + e.evt.movementX,
            y: prevPos.y + e.evt.movementY,
        }));
    }, [isPanning]);

     const handleStageMouseUpOrLeave = useCallback(() => {
         if (isPanning) {
             setIsPanning(false);
             stageRef.current?.container().style.cursor = 'grab';
         }
     }, [isPanning]);

    const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];
        const stage = stageRef.current;
        if (!stage) return;
        if (touch1 && touch2) { // Pinch zoom
             if (isTouchPanning.current) isTouchPanning.current = false;
             stage.setAttr('lastClientX', null);
             stage.setAttr('lastClientY', null);
            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            if (lastDist.current === 0) { lastDist.current = dist; return; }
            const oldScale = stage.scaleX();
            const center = { x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 };
            const pointTo = { x: (center.x - stage.x()) / oldScale, y: (center.y - stage.y()) / oldScale };
            const scaleFactor = dist / lastDist.current;
            let newScale = oldScale * scaleFactor;
            newScale = Math.max(0.15, Math.min(newScale, 3.0));
            setStageScale(newScale);
            setStagePos({ x: center.x - pointTo.x * newScale, y: center.y - pointTo.y * newScale });
            lastDist.current = dist;
        } else if (isTouchPanning.current && touch1) { // Touch pan
            const lastX = stage.getAttr('lastClientX') ?? touch1.clientX;
            const lastY = stage.getAttr('lastClientY') ?? touch1.clientY;
            setStagePos(prevPos => ({ x: prevPos.x + (touch1.clientX - lastX), y: prevPos.y + (touch1.clientY - lastY) }));
            stage.setAttr('lastClientX', touch1.clientX);
            stage.setAttr('lastClientY', touch1.clientY);
        }
    }, []);

     const handleTouchEnd = useCallback(() => {
        lastDist.current = 0;
        isTouchPanning.current = false;
        stageRef.current?.setAttr('lastClientX', null);
        stageRef.current?.setAttr('lastClientY', null);
    }, []);

    // Tạo node nổi khi double click stage
    const handleStageDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (e.target !== stageRef.current) return;
        const stage = stageRef.current;
        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;
        const worldX = (pointerPos.x - stage.x()) / stage.scaleX();
        const worldY = (pointerPos.y - stage.y()) / stage.scaleY();
        const newNodeId = uuidv4();
        const newNodeData: NodeData = { id: newNodeId, text: "", x: worldX, y: worldY };
        addNodeAndEdge(newNodeData); // Thêm node (có push history)
        setEditingNodeId(newNodeId); // Bắt đầu edit
    }, [stagePos, stageScale, addNodeAndEdge]);


    // --- Node Interaction Handlers ---

    const handleSelectNode = useCallback((nodeId: string) => {
        if (editingNodeId && editingNodeId !== nodeId) {
            (document.querySelector(`textarea[data-node-id="${editingNodeId}"]`) as HTMLTextAreaElement)?.blur();
        }
        setSelectedNodeId(nodeId);
    }, [editingNodeId, setSelectedNodeId]);

    const handleStartEditing = useCallback((nodeId: string) => { // User Story #8, #33
        setEditingNodeId(nodeId);
    }, []);

    const handleStopEditing = useCallback((save: boolean, newText?: string) => {
        const nodeId = editingNodeId; // Lấy ID trước khi reset
        setEditingNodeId(null); // Ẩn editor
        if (save && nodeId && typeof newText === 'string') {
            useEditorStore.getState().updateNodeText(nodeId, newText); // Gọi action update
        }
        stageRef.current?.container().focus(); // Focus lại stage
    }, [editingNodeId]); // Không cần dependency vào store actions

    // Kéo thả Node (User Story #10)
    const handleNodeDragStart = useCallback(() => {
        _pushHistory({ nodes: get().nodes, edges: get().edges }); // Lưu state trước khi kéo
        setDragStartState(get()); // Lưu state local
        setIsPanning(false); // Đảm bảo không pan khi drag node
    }, [_pushHistory, nodes, edges, get]); // 'get' là stable

    const handleNodeDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => {
        const stage = stageRef.current;
        const pointerPos = stage?.getPointerPosition();
        if (!stage || !pointerPos) return;

        // Cập nhật vị trí node liên tục (không push history)
        updateNodePosition(nodeId, e.target.x(), e.target.y(), false);
        setDraggedNodeId(nodeId);

        // Tìm drop target
        let targetFound: string | null = null;
        visibleNodes.forEach(targetNode => {
            if (targetNode.id === nodeId) return;
            const targetGroup = stage.findOne(`#${targetNode.id}`);
            if (!targetGroup) return;
            const box = targetGroup.getClientRect({ relativeTo: stage });
            if (pointerPos.x > box.x && pointerPos.x < box.x + box.width &&
                pointerPos.y > box.y && pointerPos.y < box.y + box.height)
            {
                targetFound = targetNode.id;
            }
        });
        setDropTargetId(targetFound);
    }, [visibleNodes, updateNodePosition]);

    const handleNodeDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => {
        const finalPos = { x: e.target.x(), y: e.target.y() };
        let reparentSuccess = false;

        if (dropTargetId && dropTargetId !== nodeId && dragStartState) {
            // Thử reparent
            reparentSuccess = reparentNode(nodeId, dropTargetId, finalPos); // Action này đã push history
            if (!reparentSuccess) {
                 // Lỗi (vd: vòng lặp), hủy drag về state cũ
                 setGraph(dragStartState.nodes, dragStartState.edges, { pushToHistory: false, clearFuture: true });
                 useToast.getState().addToast("Không thể di chuyển node vào con cháu của nó!", "error");
            }
        } else {
             // Chỉ di chuyển, không reparent
            updateNodePosition(nodeId, finalPos.x, finalPos.y, true); // Push final state
        }
        setDraggedNodeId(null);
        setDropTargetId(null);
        setDragStartState(null);
    }, [dropTargetId, dragStartState, reparentNode, updateNodePosition, setGraph, useToast]); // 'useToast' OK

    const handleToggleCollapse = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, nodeId: string) => {
        toggleNodeCollapse(nodeId); // Action này đã push history
    }, [toggleNodeCollapse]);


    // --- Render ---
    if (!isInitialized) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải...
            </div>
        );
    }

    return (
        <div 
             style={{ 
                position: 'relative', 
                width: stageSize.width, 
                height: stageSize.height, 
                cursor: isPanning ? 'grabbing' : (isTouchPanning.current ? 'grabbing' : 'grab'), 
                outline: 'none',
                background: '#1f2937' // Màu nền
            }}
             tabIndex={-1} // Để nhận key events
        >
            <Stage
                ref={stageRef}
                width={stageSize.width}
                height={stageSize.height}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
                onWheel={handleWheel}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUpOrLeave}
                onMouseLeave={handleStageMouseUpOrLeave}
                onDblClick={handleStageDblClick}
                onDblTap={handleStageDblClick}
                onTouchStart={handleStageMouseDown} // Dùng chung mousedown
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Layer>
                    {/* Render Edges */}
                    {visibleEdges.map((edge) => (
                        <Edge
                            key={edge.id || `${edge.from}-${edge.to}`}
                            edgeId={edge.id || `${edge.from}-${edge.to}`}
                            fromNodeId={edge.from}
                            toNodeId={edge.to}
                        />
                    ))}

                    {/* Render Nodes */}
                    {visibleNodes.map((node) => (
                        <Node
                            key={node.id}
                            nodeId={node.id}
                            isSelected={node.id === selectedNodeId}
                            isDropTarget={node.id === dropTargetId && node.id !== draggedNodeId}
                            hasChildren={nodesWithChildren.has(node.id)}
                            descendantCount={descendantCounts.get(node.id) || 0}
                            isEditing={node.id === editingNodeId}
                            onSelect={handleSelectNode}
                            onStartEditing={handleStartEditing}
                            onDragStart={handleNodeDragStart}
                            onDragMove={handleNodeDragMove}
                            onDragEnd={handleNodeDragEnd}
                            onToggleCollapse={handleToggleCollapse}
                        />
                    ))}
                </Layer>
            </Stage>

            {/* DOM Overlay Editor (User Story #8) */}
            <InlineTextEditor
                nodeId={editingNodeId}
                stageRef={stageRef}
                onStopEditing={handleStopEditing}
            />
        </div>
    );
};

export default MindmapStage;
