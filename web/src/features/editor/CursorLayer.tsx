import React from 'react';
import { Layer, Group, Circle, Text, Path, Rect } from 'react-konva';
import { useEditorStore } from '../../app/store/useEditorStore';

// Icon mũi tên chuột (SVG path)
const CURSOR_PATH = "M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z";

export default function CursorLayer() {
  const peers = useEditorStore((s) => s.peers);
  const scale = useEditorStore((s) => s.scale);
  const pos = useEditorStore((s) => s.pos);

  return (
    <Layer 
      listening={false}
      scaleX={scale}
      scaleY={scale}
      x={pos.x}
      y={pos.y}
    >
      {Object.values(peers).map((peer) => {
        if (peer.x == null || peer.y == null) return null;

        return (
          <Group key={peer.id} x={peer.x} y={peer.y}>
            <Path
              data={CURSOR_PATH}
              fill={peer.color}
              stroke="white"
              strokeWidth={1}
              rotation={-15}
            />
            <Group x={14} y={14}>
              <RectWrapper text={peer.name || 'User'} color={peer.color} />
            </Group>
          </Group>
        );
      })}
    </Layer>
  );
}


// Helper component để vẽ background text tự động co giãn
const RectWrapper = ({ text, color }: { text: string, color: string }) => {
    // Ước lượng độ rộng text đơn giản (hoặc dùng fix width)
    const width = text.length * 7 + 16; 
    return (
        <>
            <Rect 
                width={width} 
                height={24} 
                fill={color} 
                cornerRadius={12} 
                shadowColor="black" 
                shadowBlur={2} 
                shadowOpacity={0.2} 
                shadowOffsetY={1}
            />
            <Text 
                text={text} 
                fill="white" 
                fontSize={12} 
                fontStyle="bold"
                x={0} y={0} 
                width={width} 
                height={24} 
                align="center" 
                verticalAlign="middle" 
            />
        </>
    );
}