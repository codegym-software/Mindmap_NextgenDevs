import React from 'react';
import { Rect, Group } from 'react-konva';
import { NodeData } from '../../app/store/useEditorStore';

type BoundaryProps = {
  nodeId: string;
  nodes: NodeData[];
  edges: { from: string; to: string }[];
  nodeVisuals: Map<string, { style: NodeData; box: { w: number; h: number } }>;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
};

const Boundary: React.FC<BoundaryProps> = ({ 
  nodeId, 
  nodes, 
  edges, 
  nodeVisuals, 
  isSelected = false,
  onClick,
  onDelete 
}) => {
  const getDescendants = (id: string): string[] => {
    const children = edges.filter(edge => edge.from === id).map(edge => edge.to);
    return [...children, ...children.flatMap(getDescendants)];
  };

  // Calculate depth of boundary nesting (how many parent boundaries exist)
  const getBoundaryDepth = (id: string): number => {
    const node = nodes.find(n => n.id === id);
    if (!node || !node.parentId) return 0;
    
    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return 0;
    
    // Check if parent has boundary
    if (parent.boundary) {
      return 1 + getBoundaryDepth(parent.id);
    }
    
    return getBoundaryDepth(parent.id);
  };
  
  // [MỚI] Tính index của node trong danh sách anh em (để tránh trùng nhau)
  const getSiblingIndex = (id: string): number => {
    const node = nodes.find(n => n.id === id);
    if (!node || !node.parentId) return 0;
    
    const siblings = nodes.filter(n => n.parentId === node.parentId && n.boundary);
    return siblings.findIndex(n => n.id === id);
  };

  const node = nodes.find(n => n.id === nodeId);
  if (!node || !node.boundary) {
    return null;
  }

  // [MỚI] Nếu node bị collapse, chỉ vẽ boundary quanh chính node đó
  const isCollapsed = node.collapsed;
  const descendantIds = isCollapsed ? [nodeId] : [nodeId, ...getDescendants(nodeId)];
  
  // Filter out descendants that have their own boundaries (they will be rendered separately)
  const boundaryNodes = descendantIds
    .map(id => nodes.find(n => n.id === id))
    .filter(n => n && (n.id === nodeId || !n.boundary)) as NodeData[];

  if (boundaryNodes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  boundaryNodes.forEach(n => {
    const visual = nodeVisuals.get(n.id);
    if (visual) {
      const { x, y } = visual.style;
      const { w, h } = visual.box;
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minY = Math.min(minY, y - h / 2);
      maxY = Math.max(maxY, y + h / 2);
    }
  });

  // Calculate padding based on nesting depth
  // Boundary con phải có padding NHỎ HƠN để nằm bên trong boundary cha
  const depth = getBoundaryDepth(nodeId);
  const siblingIndex = getSiblingIndex(nodeId);
  
  const basePadding = 30; // Padding cho boundary ngoài cùng
  const depthPadding = depth * -8; // GIẢM padding cho mỗi level con
  const padding = Math.max(10, basePadding + depthPadding);
  
  // [FIX] Layout boundaries anh em: offset cả X và Y để tránh đè nhau
  // Mỗi sibling sẽ được offset một chút về phía dưới-phải
  const siblingOffsetX = siblingIndex * 8; // Offset X cho mỗi sibling
  const siblingOffsetY = siblingIndex * 8; // Offset Y cho mỗi sibling
  
  const x = minX - padding + siblingOffsetX;
  const y = minY - padding + siblingOffsetY;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  return (
    <Group>
      {/* Main boundary rectangle */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={isSelected ? "#3b82f6" : "#6B7280"}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={16}
        dash={[10, 5]}
        listening={isSelected}
      />
      
      {/* Invisible clickable overlay - only active when NOT selected for click-through */}
      {!isSelected && (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="transparent"
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true;
            if (onClick) onClick();
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      )}
      
      {/* Selection indicator when selected - BỎ label "Press Delete" */}
      {isSelected && (
        <Rect
          x={x - 4}
          y={y - 4}
          width={width + 8}
          height={height + 8}
          stroke="#3b82f6"
          strokeWidth={2}
          cornerRadius={18}
          dash={[5, 5]}
          listening={false}
        />
      )}
    </Group>
  );
};

export default Boundary;
