import React, { useMemo } from 'react';
import { Line } from 'react-konva';
import { useEditorStore } from '../../store/useEditorStore';

interface EdgeProps {
    edgeId: string; // ID của edge
    fromNodeId: string;
    toNodeId: string;
}

const Edge: React.FC<EdgeProps> = ({ edgeId, fromNodeId, toNodeId }) => {
    // Chỉ select 2 node liên quan
    const { fromNode, toNode } = useEditorStore(
        useMemo(() => (state) => ({
                fromNode: state.nodes.find(n => n.id === fromNodeId),
                toNode: state.nodes.find(n => n.id === toNodeId),
            }),
            [fromNodeId, toNodeId]
        )
    );

    // Tính toán điểm bắt đầu/kết thúc/control points
    const points = useMemo(() => {
        if (!fromNode || !toNode) return null;

        // Dùng kích thước đã được tính toán (lưu trong store)
        const fromWidth = fromNode.width || 150;
        const toWidth = toNode.width || 150;
        
        // Hướng layout (ví dụ: 'LR' - Trái sang Phải)
        // TODO: Lấy layout mode từ state
        const layoutMode: 'LR' | 'TB' = 'LR'; // Giả sử layout ngang

        let startX: number, startY: number, endX: number, endY: number;

        if (layoutMode === 'LR') {
             // Nối từ cạnh phải node cha
            startX = fromNode.x + fromWidth / 2;
            startY = fromNode.y;
             // Nối vào cạnh trái node con
            endX = toNode.x - toWidth / 2;
            endY = toNode.y;
        } else { // 'TB' - Trên xuống Dưới
             // Nối từ cạnh dưới node cha
             startX = fromNode.x;
             startY = fromNode.y + (fromNode.height || 40) / 2;
             // Nối vào cạnh trên node con
             endX = toNode.x;
             endY = toNode.y - (toNode.height || 40) / 2;
        }

        // Control points cho đường cong Bezier
        const controlX1 = layoutMode === 'LR' ? startX + (endX - startX) * 0.6 : startX;
        const controlY1 = layoutMode === 'LR' ? startY : startY + (endY - startY) * 0.6;
        const controlX2 = layoutMode === 'LR' ? endX - (endX - startX) * 0.6 : endX;
        const controlY2 = layoutMode === 'LR' ? endY : endY - (endY - startY) * 0.6;

        return [startX, startY, controlX1, controlY1, controlX2, controlY2, endX, endY];

    }, [fromNode, toNode]); // Chỉ tính lại khi 2 node liên quan thay đổi

    if (!points) return null;

    return (
        <Line
            key={edgeId}
            points={points}
            stroke="#6b7280" // Tailwind gray-500
            strokeWidth={1.5}
            bezier={true}
            tension={0.7} // Điều chỉnh độ cong
            listening={false}
            perfectDrawEnabled={false}
            transformsEnabled="position"
        />
    );
};

export default React.memo(Edge);
