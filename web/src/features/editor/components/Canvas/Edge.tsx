/**
 * Component Konva Edge (Đường nối).
 * Tái cấu trúc từ logic `Editor.tsx` gốc (phần <Line ... />).
 * Tuân thủ yêu cầu: Vẽ đường Bezier (đường cong).
 */
import React, { useMemo } from 'react';
import { Line } from 'react-konva';
import { useEditorStore } from '../../store/useEditorStore';

interface EdgeProps {
    edgeId: string;
    fromNodeId: string;
    toNodeId: string;
}

const Edge: React.FC<EdgeProps> = ({ edgeId, fromNodeId, toNodeId }) => {
    const { fromNode, toNode } = useEditorStore(
        useMemo(() => (state) => ({
                fromNode: state.nodes.find(n => n.id === fromNodeId),
                toNode: state.nodes.find(n => n.id === toNodeId),
            }),
            [fromNodeId, toNodeId]
        )
    );

    const points = useMemo(() => {
        if (!fromNode || !toNode) return null;
        const fromWidth = fromNode.width || 150;
        const toWidth = toNode.width || 150;

        const startX = fromNode.x + fromWidth / 2;
        const startY = fromNode.y;
        const endX = toNode.x - toWidth / 2;
        const endY = toNode.y;

        const controlXOffset = Math.abs(endX - startX) * 0.6;
        const c1x = startX + controlXOffset;
        const c1y = startY;
        const c2x = endX - controlXOffset;
        const c2y = endY;

        return [startX, startY, c1x, c1y, c2x, c2y, endX, endY];
    }, [fromNode, toNode]);

    if (!points) return null;

    return (
        <Line
            key={edgeId}
            points={points}
            stroke="#6b7280"
            strokeWidth={1.5}
            bezier={true}
            tension={0.7}
            listening={false}
            perfectDrawEnabled={false}
            transformsEnabled="position"
        />
    );
};

export default React.memo(Edge);