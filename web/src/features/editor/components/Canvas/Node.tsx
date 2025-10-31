import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Group, Rect, Text, Circle, Path, Ellipse } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '../../store/useEditorStore';
import { NodeData } from '../../../../core/types'; // Import từ core
import { getNodeStyle, calculateLevel, calculateNodeDimensions } from '../../../../core/utils/helpers'; // Import helpers

// --- Node Component Props ---
interface NodeProps {
    nodeId: string;
    isSelected: boolean;
    isDropTarget: boolean;
    hasChildren: boolean;
    descendantCount: number;
    isEditing: boolean;
    onSelect: (nodeId: string) => void;
    onStartEditing: (nodeId: string) => void;
    onDragStart: () => void;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => void;
    onToggleCollapse: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, nodeId: string) => void;
}

// --- Node Component ---
const Node: React.FC<NodeProps> = React.memo(({
    nodeId, isSelected, isDropTarget, hasChildren, descendantCount, isEditing,
    onSelect, onStartEditing, onDragStart, onDragMove, onDragEnd, onToggleCollapse
}) => {
    const groupRef = useRef<Konva.Group>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Lấy data của node này và action update dimensions
    const { node, allNodes, updateNodeDimensions } = useEditorStore(
        useCallback(
            (state) => ({
                node: state.nodes.find(n => n.id === nodeId),
                allNodes: state.nodes, // Cần allNodes để tính level
                updateNodeDimensions: state.updateNodeDimensions
            }),
            [nodeId]
        )
    );

    // --- Tính toán Style và Kích thước ---
    const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);
    const level = useMemo(() => node ? calculateLevel(node.id, nodeMap) : 0, [node, nodeMap]);
    
    // Style ghi đè (từ User Story #14) + Style theo level
    const baseStyle = useMemo(() => getNodeStyle(level), [level]);
    const finalStyle = useMemo(() => ({
        ...baseStyle,
        ...(node?.style || {}) // Ghi đè style từ store (nếu có)
    }), [baseStyle, node?.style]);

    // Tính toán kích thước (tuân thủ User Story #34)
    const { width, height, textToRender } = useMemo(
        () => calculateNodeDimensions(node?.text ?? '', finalStyle),
        [node?.text, finalStyle]
    );

    // Cập nhật kích thước vào store để Edge.tsx có thể sử dụng
    useEffect(() => {
        if (node && (width !== node.width || height !== node.height)) {
            updateNodeDimensions(node.id, width, height);
        }
    }, [node?.id, width, height, node?.width, node?.height, updateNodeDimensions]);

    // --- Event Handlers (Memoized) ---
    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        const stage = groupRef.current?.getStage();
        if (stage) stage.container().style.cursor = 'pointer';
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        const stage = groupRef.current?.getStage();
        if (stage && stage.container().style.cursor === 'pointer') {
            stage.container().style.cursor = 'grab';
        }
    }, []);

    const handleDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        e.cancelBubble = true;
        onStartEditing(nodeId); // User Story #8
    }, [nodeId, onStartEditing]);

    const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        e.cancelBubble = true;
        onSelect(nodeId);
    }, [nodeId, onSelect]);

    // (Các hàm drag/toggle chỉ đơn giản là gọi prop)
    const handleDragStartInternal = useCallback(() => onDragStart(), [onDragStart]);
    const handleDragMoveInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => onDragMove(e, nodeId), [nodeId, onDragMove]);
    const handleDragEndInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e, nodeId), [nodeId, onDragEnd]);
    const handleToggleInternal = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        e.cancelBubble = true; // Ngăn không cho click/select node
        onToggleCollapse(e, nodeId); // User Story #16
    }, [nodeId, onToggleCollapse]);

    // --- Render Logic ---
    if (!node) return null;

    const isCollapsed = node.collapsed ?? false;
    const showCollapseButton = hasChildren && (isHovered || isSelected);
    const NodeShape = finalStyle.shape === 'ellipse' ? Ellipse : Rect;
    const shapeProps = finalStyle.shape === 'ellipse'
        ? { radiusX: width / 2, radiusY: height / 2 }
        : { width: width, height: height, cornerRadius: 8 }; // Bo góc

    return (
        <Group
            ref={groupRef}
            id={nodeId}
            x={node.x}
            y={node.y}
            draggable // User Story #10
            onDragStart={handleDragStartInternal}
            onDragMove={handleDragMoveInternal}
            onDragEnd={handleDragEndInternal}
            onClick={handleClick}
            onTap={handleClick}
            onDblClick={handleDblClick}
            onDblTap={handleDblClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            offsetX={width / 2} // Đặt tâm group vào (0,0) của nó
            offsetY={height / 2}
            perfectDrawEnabled={false}
            transformsEnabled="position"
        >
            {/* Main Node Shape */}
            <NodeShape
                {...shapeProps}
                fill={finalStyle.bg}
                stroke={isDropTarget ? "#10B981" : (isSelected ? "#60a5fa" : finalStyle.border)}
                strokeWidth={isDropTarget ? 3.5 : (isSelected ? 3 : finalStyle.width)}
                shadowColor="rgba(0,0,0,0.3)"
                shadowBlur={isSelected || isHovered ? 10 : 5}
                shadowOpacity={0.5}
                shadowOffsetX={2}
                shadowOffsetY={2}
                perfectDrawEnabled={false}
            />
            {/* Node Text (Ẩn khi đang chỉnh sửa) */}
             <Text
                visible={!isEditing} // Ẩn khi component cha báo đang editing
                text={textToRender || '(Trống)'}
                width={width}
                height={height}
                align="center"
                verticalAlign="middle"
                fill={finalStyle.textColor}
                fontSize={finalStyle.fontSize}
                fontStyle={finalStyle.fontWeight}
                fontFamily='"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                lineHeight={LINE_HEIGHT_MULTIPLIER}
                paddingX={PADDING_X}
                paddingY={PADDING_Y}
                listening={false} // Text không nhận sự kiện
                perfectDrawEnabled={false}
            />

            {/* Collapse/Expand Button (User Story #16) */}
            {hasChildren && (
                 <Group
                    x={width / 2 + 3} // Đặt ở cạnh phải, hơi lệch ra ngoài
                    y={0} // Căn giữa theo chiều dọc
                    visible={showCollapseButton}
                    onClick={handleToggleInternal}
                    onTap={handleToggleInternal}
                    onMouseEnter={handleMouseEnter} // Giữ cursor pointer
                    onMouseLeave={handleMouseLeave}
                >
                    <Circle
                        radius={7.5}
                        fill={isHovered ? "#e2e8f0" : "#f8fafc"}
                        stroke={isSelected ? "#60a5fa" : "#94a3b8"}
                        strokeWidth={1}
                        shadowColor="rgba(0,0,0,0.2)"
                        shadowBlur={3}
                        shadowOpacity={0.6}
                    />
                    {isCollapsed ? (
                        <Text
                            text={`${descendantCount > 9 ? '9+' : descendantCount}`}
                            fontSize={8}
                            fill="#3b82f6"
                            width={15}
                            height={15}
                            offsetX={7.5}
                            offsetY={7.5}
                            align="center"
                            verticalAlign="middle"
                            fontStyle="bold"
                            listening={false}
                        />
                    ) : (
                        <Path
                            data="M -3 0 H 3" // Dấu trừ
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            lineCap="round"
                            listening={false}
                        />
                    )}
                </Group>
            )}
        </Group>
    );
});

export default Node;
