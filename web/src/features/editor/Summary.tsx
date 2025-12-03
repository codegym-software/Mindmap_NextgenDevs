import React, { useState } from 'react';
import { Path, Rect, Circle as KonvaCircle, Text as KonvaText, Group } from 'react-konva';
import { SummaryData, NodeData } from '../../app/store/useEditorStore';

type SummaryProps = {
  summary: SummaryData;
  nodes: NodeData[];
  nodeVisuals: Map<string, { style: any; box: any }>;
  isSelected?: boolean;
  onUpdateRange?: (summaryId: string, newStartNodeId: string, newEndNodeId: string) => void;
  onClick?: () => void;
  onDelete?: () => void;
};

const Summary: React.FC<SummaryProps> = ({ 
  summary, 
  nodes, 
  nodeVisuals, 
  isSelected = false,
  onUpdateRange,
  onClick,
  onDelete
}) => {
  const startVisual = nodeVisuals.get(summary.startNodeId);
  const endVisual = nodeVisuals.get(summary.endNodeId);
  const summaryNodeVisual = summary.summaryNodeId ? nodeVisuals.get(summary.summaryNodeId) : null;

  if (!startVisual || !endVisual) return null;

  const { style: startStyle, box: startBox } = startVisual;
  const { style: endStyle, box: endBox } = endVisual;

  // Lấy tất cả nodes con của parent
  const parentNode = nodes.find(n => n.id === summary.parentId);
  if (!parentNode) return null;
  
  const siblings = nodes.filter(n => n.parentId === summary.parentId);
  
  // Xác định side (left/right)
  const side = startStyle.side || 'right';
  const isLeft = side === 'left';

  // Local state cho dragging resize handles
  const [localStartNodeId, setLocalStartNodeId] = useState(summary.startNodeId);
  const [localEndNodeId, setLocalEndNodeId] = useState(summary.endNodeId);

  const currentStartVisual = nodeVisuals.get(localStartNodeId);
  const currentEndVisual = nodeVisuals.get(localEndNodeId);

  if (!currentStartVisual || !currentEndVisual) return null;

  const { style: currentStartStyle, box: currentStartBox } = currentStartVisual;
  const { style: currentEndStyle, box: currentEndBox } = currentEndVisual;

  // [FIX] Tìm tất cả leaf nodes trong range
  // Nếu node bị collapse, chỉ dùng chính node đó, không tìm con
  const getLeafNodesInRange = () => {
    const startIdx = siblings.findIndex(n => n.id === localStartNodeId);
    const endIdx = siblings.findIndex(n => n.id === localEndNodeId);
    const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];

    const collectLeafNodes = (nodeId: string): string[] => {
      const children = nodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) return [nodeId];
      return children.flatMap(child => collectLeafNodes(child.id));
    };

    const leafNodes: string[] = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      leafNodes.push(...collectLeafNodes(siblings[i].id));
    }
    return leafNodes;
  };

  const leafNodeIds = getLeafNodesInRange();
  
  // Tính toán vị trí X ngoài cùng của leaf nodes
  let braceX = isLeft ? Infinity : -Infinity;
  let startY = Infinity;
  let endY = -Infinity;

  leafNodeIds.forEach(leafId => {
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

  // Điều chỉnh position cho brace
  const startX = isLeft ? braceX - 20 : braceX + 20;
  const height = endY - startY;
  const midY = (startY + endY) / 2;
  const braceWidth = 15;

  // Tạo curly brace path
  const createCurlyBracePath = () => {
    const direction = isLeft ? -1 : 1;
    const x1 = startX;
    const x2 = startX + (braceWidth * direction);
    const xMid = startX + (braceWidth * direction * 1.5);

    if (summary.braceStyle === 'square') {
      // Square bracket
      return `
        M ${x1} ${startY}
        L ${x2} ${startY}
        L ${x2} ${endY}
        L ${x1} ${endY}
      `;
    } else {
      // Curly brace
      const controlY1 = startY + height * 0.3;
      const controlY2 = endY - height * 0.3;

      return `
        M ${x1} ${startY}
        Q ${x2} ${startY}, ${x2} ${controlY1}
        Q ${x2} ${midY - 5}, ${xMid} ${midY}
        Q ${x2} ${midY + 5}, ${x2} ${controlY2}
        Q ${x2} ${endY}, ${x1} ${endY}
      `;
    }
  };

  // Tính toán selection box - bao quanh tất cả nodes từ start đến end và children của chúng
  const getSelectionBox = () => {
    const startNode = nodes.find(n => n.id === localStartNodeId);
    const endNode = nodes.find(n => n.id === localEndNodeId);
    if (!startNode || !endNode) return null;

    // Thu thập tất cả descendants của các nodes trong range
    const collectDescendants = (nodeId: string): string[] => {
      const children = nodes.filter(n => n.parentId === nodeId).map(n => n.id);
      return [nodeId, ...children.flatMap(collectDescendants)];
    };

    const allNodeIds = new Set<string>();
    const startIdx = siblings.findIndex(n => n.id === localStartNodeId);
    const endIdx = siblings.findIndex(n => n.id === localEndNodeId);
    const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];

    for (let i = minIdx; i <= maxIdx; i++) {
      collectDescendants(siblings[i].id).forEach(id => allNodeIds.add(id));
    }

    // Tìm bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allNodeIds.forEach(id => {
      const visual = nodeVisuals.get(id);
      if (visual) {
        const { style, box } = visual;
        const x1 = style.x - box.w / 2;
        const y1 = style.y - box.h / 2;
        const x2 = style.x + box.w / 2;
        const y2 = style.y + box.h / 2;
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
      }
    });

    return { x: minX - 10, y: minY - 10, width: maxX - minX + 20, height: maxY - minY + 20 };
  };

  const selectionBox = isSelected ? getSelectionBox() : null;

  // Handle resize
  const handleTopHandleDrag = (e: any) => {
    const newY = e.target.y();
    // Tìm sibling node gần nhất phía trên
    const sortedSiblings = siblings.sort((a, b) => {
      const aVisual = nodeVisuals.get(a.id);
      const bVisual = nodeVisuals.get(b.id);
      return (aVisual?.style.y || 0) - (bVisual?.style.y || 0);
    });

    let closestNode = localStartNodeId;
    let minDist = Infinity;
    sortedSiblings.forEach(sib => {
      const visual = nodeVisuals.get(sib.id);
      if (visual) {
        const dist = Math.abs(visual.style.y - newY);
        if (dist < minDist) {
          minDist = dist;
          closestNode = sib.id;
        }
      }
    });
    setLocalStartNodeId(closestNode);
  };

  const handleBottomHandleDrag = (e: any) => {
    const newY = e.target.y();
    const sortedSiblings = siblings.sort((a, b) => {
      const aVisual = nodeVisuals.get(a.id);
      const bVisual = nodeVisuals.get(b.id);
      return (aVisual?.style.y || 0) - (bVisual?.style.y || 0);
    });

    let closestNode = localEndNodeId;
    let minDist = Infinity;
    sortedSiblings.forEach(sib => {
      const visual = nodeVisuals.get(sib.id);
      if (visual) {
        const dist = Math.abs(visual.style.y - newY);
        if (dist < minDist) {
          minDist = dist;
          closestNode = sib.id;
        }
      }
    });
    setLocalEndNodeId(closestNode);
  };

  const handleTopHandleDragEnd = () => {
    if (onUpdateRange) {
      onUpdateRange(summary.id, localStartNodeId, localEndNodeId);
    }
  };

  const handleBottomHandleDragEnd = () => {
    if (onUpdateRange) {
      onUpdateRange(summary.id, localStartNodeId, localEndNodeId);
    }
  };

  return (
    <>
      {/* Selection box khi node summary được select */}
      {isSelected && selectionBox && (
        <Rect
          x={selectionBox.x}
          y={selectionBox.y}
          width={selectionBox.width}
          height={selectionBox.height}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[5, 5]}
          fill="transparent"
        />
      )}

      {/* Brace */}
      <Path
        data={createCurlyBracePath()}
        stroke={summary.color || '#f59e0b'}
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
        fill="transparent"
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

      {/* Summary text ở vị trí mũi nhọn giữa */}
      {summary.summaryText && !summary.summaryNodeId && (
        <KonvaText
          x={isLeft ? startX - braceWidth - 60 : startX + braceWidth + 10}
          y={midY - 10}
          text={summary.summaryText}
          fontSize={14}
          fill={summary.color || '#f59e0b'}
          fontStyle="bold"
          width={80}
          align={isLeft ? 'right' : 'left'}
        />
      )}

      {/* Resize handles - chỉ hiện khi selected */}
      {isSelected && (
        <>
          {/* Top handle */}
          <KonvaCircle
            x={startX}
            y={startY}
            radius={6}
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragMove={handleTopHandleDrag}
            onDragEnd={handleTopHandleDragEnd}
            dragBoundFunc={(pos) => ({ x: startX, y: pos.y })}
          />
          {/* Bottom handle */}
          <KonvaCircle
            x={startX}
            y={endY}
            radius={6}
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragMove={handleBottomHandleDrag}
            onDragEnd={handleBottomHandleDragEnd}
            dragBoundFunc={(pos) => ({ x: startX, y: pos.y })}
          />
        </>
      )}
    </>
  );
};

export default Summary;
