/**
 * Component Konva Node.
 * Tái cấu trúc từ logic code gốc (Editor.tsx) của bạn.
 * Tuân thủ Hybrid: Vẽ node, tính level, áp style, xử lý drag, dblclick.
 */
import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Group, Rect, Text, Circle, Path, Ellipse } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '../../store/useEditorStore';
import { NodeData } from '../../../../core/types';
import { getNodeStyle, calculateLevel, calculateNodeDimensions } from '../../../../core/utils/helpers';

// --- Props Interface ---
interface NodeProps {
    nodeId: string;
    isSelected: boolean;
    isEditing: boolean;
    isDropTarget: boolean;
    hasChildren: boolean;
    descendantCount: number;
    onSelect: (nodeId: string) => void;
    onStartEditing: (nodeId: string) => void;
    onDragStart: () => void;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => void;
    onToggleCollapse: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, nodeId: string) => void;
}

// --- Node Component ---
const Node: React.FC<NodeProps> = React.memo(({
    nodeId, isSelected, isEditing, isDropTarget, hasChildren, descendantCount,
    onSelect, onStartEditing, onDragStart, onDragMove, onDragEnd, onToggleCollapse
}) => {
    const groupRef = useRef<Konva.Group>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Lấy data của node này và action update dimensions
    const { node, allNodes, updateNodeDimensions } = useEditorStore(
        useCallback(
            (state) => ({
                node: state.nodes.find(n => n.id === nodeId),
                allNodes: state.nodes,
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
        ...(node?.style || {})
    }), [baseStyle, node?.style]);

    // Tính toán kích thước (tuân thủ User Story #34)
    const { width, height, textToRender, finalFontSize } = useMemo(
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
        onStartEditing(nodeId);
    }, [nodeId, onStartEditing]);

    const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        e.cancelBubble = true;
        onSelect(nodeId);
    }, [nodeId, onSelect]);

    const handleDragStartInternal = useCallback(() => onDragStart(), [onDragStart]);
    const handleDragMoveInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => onDragMove(e, nodeId), [nodeId, onDragMove]);
    const handleDragEndInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e, nodeId), [nodeId, onDragEnd]);
    const handleToggleInternal = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        e.cancelBubble = true;
        onToggleCollapse(e, nodeId);
    }, [nodeId, onToggleCollapse]);

    // --- Render Logic ---
    if (!node) return null;
    const isCollapsed = node.collapsed ?? false;
    const showCollapseButton = hasChildren && (isHovered || isSelected);
    const NodeShape = finalStyle.shape === 'ellipse' ? Ellipse : Rect;
   
    const shapeProps = finalStyle.shape === 'ellipse'
        ? { radiusX: width / 2, radiusY: height / 2 }
        : { width: width, height: height, cornerRadius: 10 };

    return (
        <Group
            ref={groupRef}
            id={nodeId}
            x={node.x}
            y={node.y}
            draggable
            onDragStart={handleDragStartInternal}
            onDragMove={handleDragMoveInternal}
            onDragEnd={handleDragEndInternal}
            onClick={handleClick}
            onTap={handleClick}
            onDblClick={handleDblClick}
            onDblTap={handleDblClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            offsetX={width / 2}
            offsetY={height / 2}
            perfectDrawEnabled={false}
            transformsEnabled="position"
        >
            {/* Main Node Shape */}
            <NodeShape
                {...shapeProps}
                fill={finalStyle.backgroundColor}
                stroke={isDropTarget ? "#10B981" : (isSelected ? "#60a5fa" : finalStyle.borderColor)}
                strokeWidth={isDropTarget ? 3.5 : (isSelected ? 3 : finalStyle.borderWidth)}
                shadowColor="rgba(0,0,0,0.3)"
                shadowBlur={isSelected || isHovered ? 10 : 5}
                shadowOpacity={0.5}
                shadowOffsetX={2}
                shadowOffsetY={2}
                perfectDrawEnabled={false}
            />
            {/* Node Text (Ẩn khi đang chỉnh sửa) */}
            <Text
                visible={!isEditing}
                text={textToRender || '(Trống)'}
                width={width}
                height={height}
                align="center"
                verticalAlign="middle"
                fill={finalStyle.textColor}
                fontSize={finalFontSize}
                fontStyle={finalStyle.fontWeight}
                fontFamily='"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                lineHeight={1.3}
                paddingX={20}
                paddingY={12}
                listening={false}
                perfectDrawEnabled={false}
            />
            {/* Collapse/Expand Button (User Story #16) */}
            {hasChildren && (
                <Group
                    x={width / 2 + 3}
                    y={0}
                    visible={showCollapseButton}
                    onClick={handleToggleInternal}
                    onTap={handleToggleInternal}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Circle
                        radius={8}
                        fill={isHovered ? "#e2e8f0" : "#f8fafc"}
                        stroke={isSelected ? "#60a5fa" : "#94a3b8"}
                        strokeWidth={1.5}
                        shadowColor="rgba(0,0,0,0.2)"
                        shadowBlur={3}
                        shadowOpacity={0.6}
                    />
                    {isCollapsed ? (
                        <Text
                            text={`${descendantCount > 9 ? '9+' : descendantCount}`}
                            fontSize={9}
                            fill="#3b82f6"
                            width={16}
                            height={16}
                            offsetX={8}
                            offsetY={8}
                            align="center"
                            verticalAlign="middle"
                            fontStyle="bold"
                            listening={false}
                        />
                    ) : (
                        <Path
                            data="M -4 0 H 4"
                            stroke="#3b82f6"
                            strokeWidth={2}
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