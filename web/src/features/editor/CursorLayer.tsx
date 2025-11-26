import React from 'react';
import { Layer, Group, Text, Path, Rect } from 'react-konva';
import { useEditorStore } from '../../app/store/useEditorStore';

// Icon mũi tên chuột (SVG Path chuẩn)
// Icon mouse std figma
const CURSOR_PATH = "M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z";

export default function CursorLayer() {
  // Lấy danh sách peers từ Store
  const peers = useEditorStore((s) => s.peers);
  
  // Chuyển đổi object peers thành mảng để render
  const peerList = Object.values(peers);

  if (peerList.length === 0) return null;

  return (
    // listening={false}: Tắt tương tác chuột để tăng hiệu năng và cho phép click xuyên qua
    <Layer listening={false}>
      {peerList.map((peer) => (
        <Group key={peer.id} x={peer.x} y={peer.y}>
          {/* 1. Vẽ mũi tên chuột */}
          <Path
            data={CURSOR_PATH}
            fill={peer.color}
            stroke="white"
            strokeWidth={1}
            shadowColor="black"
            shadowBlur={2}
            shadowOpacity={0.3}
            rotation={-17} // Nghiêng nhẹ cho giống chuột thật
          />
          
          {/* 2. Vẽ nhãn tên (Badge) */}
          {peer.name && (
            <Group x={16} y={16}>
               <Badge text={peer.name} color={peer.color} />
            </Group>
          )}
        </Group>
      ))}
    </Layer>
  );
}

// Component con vẽ Badge tên (Tự động co giãn theo độ dài tên)
const Badge = ({ text, color }: { text: string, color: string }) => {
    // Tính toán độ rộng ước lượng (7px per char + 16px padding)
    const width = Math.max(text.length * 8 + 16, 40);
    const height = 24;

    return (
        <>
            {/* Nền Badge */}
            <Rect 
                width={width} 
                height={height} 
                fill={color} 
                cornerRadius={6} // Bo góc mềm mại
                opacity={0.9}
            />
            {/* Chữ */}
            {/* Set front chu*/}
            <Text 
                text={text} 
                fill="white" 
                fontSize={12} 
                fontStyle="bold"
                fontFamily="Inter, sans-serif"
                x={0} y={0} 
                width={width} 
                height={height} 
                align="center" 
                verticalAlign="middle" 
            />
        </>
    );
}