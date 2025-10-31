import React, { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { useEditorStore, NodeData } from '../../store/useEditorStore';
import Konva from 'konva';
import { getNodeStyle, calculateLevel } from '../../../../core/utils/helpers'; // Import helpers

// --- Style definitions (phải khớp với Node.tsx) ---
const PADDING_X = 14;
const PADDING_Y = 8;
const LINE_HEIGHT_MULTIPLIER = 1.35;

/**
 * Component DOM (textarea) để chỉnh sửa text,
 * được đặt chồng chính xác lên Konva Node.
 * Tuân thủ Hybrid: DOM * Canvas.
 * Tuân thủ User Story #8, #33, #34.
 */
const InlineTextEditor: React.FC<{
    nodeId: string | null; // Node đang được edit
    stageRef: React.RefObject<Konva.Stage>;
    onStopEditing: (save: boolean, newText?: string) => void; // Callback khi kết thúc
}> = ({ nodeId, stageRef, onStopEditing }) => {
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [currentText, setCurrentText] = useState('');

    // Lấy data của node đang edit và toàn bộ nodes (để tính level)
    const { node, allNodes } = useEditorStore(
        useCallback(
            (state) => ({
                node: state.nodes.find(n => n.id === nodeId),
                allNodes: state.nodes
            }),
            [nodeId]
        )
    );

    // Tính toán style và level
    const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);
    const level = useMemo(() => node ? calculateLevel(node.id, nodeMap) : 0, [node, nodeMap]);
    
    const baseStyle = useMemo(() => getNodeStyle(level), [level]);
    const finalStyle = useMemo(() => ({
        ...baseStyle,
        ...(node?.style || {}) // Ghi đè style
    }), [baseStyle, node?.style]);

    // Tính toán vị trí và kích thước của textarea
    const positionStyle = useMemo(() => {
        if (!node || !stageRef.current) return { display: 'none' };

        const width = node.width || 150; // Dùng kích thước đã được Node.tsx tính
        const height = node.height || 40;
        const fontSize = finalStyle.fontSize;
        const fontWeight = finalStyle.fontWeight;

        const stage = stageRef.current;
        const stageContainer = stage.container();
        if(!stageContainer) return { display: 'none' };
        const stageRect = stageContainer.getBoundingClientRect();

        // Tính vị trí tuyệt đối trên trang
        const absPos = stage.getAbsoluteTransform().point({ x: node.x, y: node.y });

        return {
            display: 'block',
            position: 'absolute' as const,
            left: `${stageRect.left + absPos.x - width / 2}px`,
            top: `${stageRect.top + absPos.y - height / 2}px`,
            width: `${width}px`,
            minHeight: `${height}px`, // Chiều cao tối thiểu
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            lineHeight: `${LINE_HEIGHT_MULTIPLIER}`,
            padding: `${PADDING_Y}px ${PADDING_X}px`, // Phải khớp 100% với Konva.Text
        };
    }, [node, stageRef, finalStyle, node?.width, node?.height]); // Phụ thuộc vào cả width/height

    // --- Effects ---

    // Cập nhật text của textarea khi node thay đổi
    useEffect(() => {
        if (node) {
            setCurrentText(node.text);
        }
    }, [node]);

    // Focus, select text, và auto-resize khi editor xuất hiện (User Story #33)
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (nodeId && textarea) {
            textarea.focus();
            textarea.select();
            // Auto-resize
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [nodeId]);

    // --- Event Handlers ---

    // Tự động điều chỉnh chiều cao khi gõ (User Story #34)
    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }, []);

    // Xử lý Enter (Lưu), Shift+Enter (Xuống dòng), Escape (Hủy)
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onStopEditing(true, currentText);
        } else if (e.key === 'Escape') {
            onStopEditing(false); // Hủy, không lưu
        }
    }, [onStopEditing, currentText]);

    // Lưu khi click ra ngoài (Blur)
    const handleBlur = useCallback(() => {
        onStopEditing(true, currentText);
    }, [onStopEditing, currentText]);


    if (!nodeId || !node) {
        return null;
    }

    return (
        <textarea
            ref={textareaRef}
            value={currentText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={positionStyle}
            className="absolute z-50 bg-white dark:bg-gray-800 text-black dark:text-white rounded-md outline-none resize-none ring-2 ring-blue-500/80 border-none overflow-hidden text-center shadow-lg font-sans"
            wrap="soft"
            rows={1}
            data-node-id={nodeId}
        />
    );
};

export default InlineTextEditor;
