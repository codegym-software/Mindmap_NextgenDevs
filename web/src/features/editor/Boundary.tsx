import React from 'react';
import { Rect } from 'react-konva';
import { NodeData } from '../../app/store/useEditorStore';

type BoundaryProps = {
  nodeId: string;
  nodes: NodeData[];
  edges: { from: string; to: string }[];
  nodeVisuals: Map<string, { style: NodeData; box: { w: number; h: number } }>;
};

const Boundary: React.FC<BoundaryProps> = ({ nodeId, nodes, edges, nodeVisuals }) => {
  const getDescendants = (id: string): string[] => {
    const children = edges.filter(edge => edge.from === id).map(edge => edge.to);
    return [...children, ...children.flatMap(getDescendants)];
  };

  const node = nodes.find(n => n.id === nodeId);
  if (!node || !node.boundary) {
    return null;
  }

  const descendantIds = [nodeId, ...getDescendants(nodeId)];
  const boundaryNodes = descendantIds.map(id => nodes.find(n => n.id === id)).filter(Boolean) as NodeData[];

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

  const padding = 8;
  const x = minX - padding;
  const y = minY - padding;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke="#6B7280"
      strokeWidth={2}
      cornerRadius={16}
      dash={[10, 5]}
    />
  );
};

export default Boundary;
