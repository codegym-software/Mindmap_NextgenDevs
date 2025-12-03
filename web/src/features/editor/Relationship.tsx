import React, { useState, useEffect } from 'react';
import { Arrow, Circle as KonvaCircle, Text as KonvaText, Rect } from 'react-konva';
import { RelationshipData, NodeData } from '../../app/store/useEditorStore';

type RelationshipProps = {
  relationship: RelationshipData;
  nodes: NodeData[];
  nodeVisuals: Map<string, { style: any; box: any }>;
  isSelected?: boolean;
  onUpdateControlPoints?: (relationshipId: string, cp1: { x: number; y: number }, cp2: { x: number; y: number }) => void;
  onUpdateLabel?: (relationshipId: string, label: string) => void;
  onClick?: (relationshipId: string) => void;
};

const Relationship: React.FC<RelationshipProps> = ({ 
  relationship, 
  nodes, 
  nodeVisuals, 
  isSelected = false,
  onUpdateControlPoints,
  onUpdateLabel,
  onClick
}) => {
  const fromVisual = nodeVisuals.get(relationship.from);
  const toVisual = nodeVisuals.get(relationship.to);

  if (!fromVisual || !toVisual) return null;

  const { style: fromStyle, box: fromBox } = fromVisual;
  const { style: toStyle, box: toBox } = toVisual;

  // Tính điểm trên cạnh node thay vì tâm
  const dx = toStyle.x - fromStyle.x;
  const dy = toStyle.y - fromStyle.y;
  const angle = Math.atan2(dy, dx);
  
  // Điểm bắt đầu và kết thúc trên cạnh node
  const p1 = { 
    x: fromStyle.x + Math.cos(angle) * (fromBox.w / 2), 
    y: fromStyle.y + Math.sin(angle) * (fromBox.h / 2) 
  };
  const p4 = { 
    x: toStyle.x - Math.cos(angle) * (toBox.w / 2), 
    y: toStyle.y - Math.sin(angle) * (toBox.h / 2) 
  };

  // Control points cho bezier curve
  const cp1 = relationship.controlPoint1 || { 
    x: p1.x + (p4.x - p1.x) / 3, 
    y: p1.y 
  };
  const cp2 = relationship.controlPoint2 || { 
    x: p1.x + 2 * (p4.x - p1.x) / 3, 
    y: p4.y 
  };

  // Tạo bezier curve points
  const points = [
    p1.x, p1.y,
    cp1.x, cp1.y,
    cp2.x, cp2.y,
    p4.x, p4.y
  ];

  const lineProps = {
    points,
    stroke: relationship.color || '#3b82f6',
    strokeWidth: 2,
    dash: [10, 5], // Always dashed
    bezier: true,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  };

  // Markers
  const showStartMarker = relationship.startMarker && relationship.startMarker !== 'none';
  const showEndMarker = relationship.endMarker && relationship.endMarker !== 'none';

  const [localCP1, setLocalCP1] = useState(cp1);
  const [localCP2, setLocalCP2] = useState(cp2);

  // Sync local state when props change
  useEffect(() => {
    setLocalCP1(relationship.controlPoint1 || { 
      x: p1.x + (p4.x - p1.x) / 3, 
      y: p1.y 
    });
    setLocalCP2(relationship.controlPoint2 || { 
      x: p1.x + 2 * (p4.x - p1.x) / 3, 
      y: p4.y 
    });
  }, [relationship.controlPoint1, relationship.controlPoint2, p1.x, p1.y, p4.x, p4.y]);

  const handleCP1Drag = (e: any) => {
    const newPos = { x: e.target.x(), y: e.target.y() };
    setLocalCP1(newPos);
  };

  const handleCP2Drag = (e: any) => {
    const newPos = { x: e.target.x(), y: e.target.y() };
    setLocalCP2(newPos);
  };

  const handleCP1DragEnd = (e: any) => {
    const newPos = { x: e.target.x(), y: e.target.y() };
    if (onUpdateControlPoints) {
      onUpdateControlPoints(relationship.id, newPos, localCP2);
    }
  };

  const handleCP2DragEnd = (e: any) => {
    const newPos = { x: e.target.x(), y: e.target.y() };
    if (onUpdateControlPoints) {
      onUpdateControlPoints(relationship.id, localCP1, newPos);
    }
  };

  // Recalculate points with current control points
  const currentPoints = [
    p1.x, p1.y,
    localCP1.x, localCP1.y,
    localCP2.x, localCP2.y,
    p4.x, p4.y
  ];

  // Label node sẽ được tính vị trí tự động trong computedNodeStyles của Editor.tsx

  return (
    <>
      {/* Start marker */}
      {showStartMarker && relationship.startMarker === 'circle' && (
        <KonvaCircle
          x={p1.x}
          y={p1.y}
          radius={4}
          fill={relationship.color || '#3b82f6'}
        />
      )}

      {/* Main line */}
      {showEndMarker && relationship.endMarker === 'arrow' ? (
        <Arrow 
          {...lineProps}
          points={currentPoints}
          pointerLength={10} 
          pointerWidth={8} 
          fill={relationship.color || '#3b82f6'}
          onClick={(e) => {
            e.cancelBubble = true;
            if (onClick) onClick(relationship.id);
          }}
        />
      ) : (
        <Arrow 
          {...lineProps} 
          points={currentPoints} 
          pointerLength={0}
          onClick={(e) => {
            e.cancelBubble = true;
            if (onClick) onClick(relationship.id);
          }}
        />
      )}

      {/* End marker */}
      {showEndMarker && relationship.endMarker === 'circle' && (
        <KonvaCircle
          x={p4.x}
          y={p4.y}
          radius={4}
          fill={relationship.color || '#3b82f6'}
        />
      )}

      {/* Label node sẽ được render riêng trong Editor.tsx như node bình thường */}

      {/* Control point handles - only show when selected */}
      {isSelected && (
        <>
          <KonvaCircle
            x={localCP1.x}
            y={localCP1.y}
            radius={6}
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragMove={handleCP1Drag}
            onDragEnd={handleCP1DragEnd}
          />
          <KonvaCircle
            x={localCP2.x}
            y={localCP2.y}
            radius={6}
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragMove={handleCP2Drag}
            onDragEnd={handleCP2DragEnd}
          />
        </>
      )}
    </>
  );
};

export default Relationship;
