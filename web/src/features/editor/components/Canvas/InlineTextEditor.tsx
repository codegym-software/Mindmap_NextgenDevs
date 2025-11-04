/**
 * Component DOM (textarea) để chỉnh sửa text.
 * Tái cấu trúc từ logic `Editor.tsx` gốc (phần `editing && <input ... />`).
 * Tuân thủ Hybrid: DOM * Canvas.
 * Tuân thủ User Story #8, #33, #34.
 */
import React, { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import Konva from 'konva';
import { getNodeStyle, calculateLevel, calculateNodeDimensions } from '../../../../core/utils/helpers';
import { NodeData } from '../../../../core/types';

// --- Style definitions (phải khớp 100% với Node.tsx/helpers.ts) ---
const PADDING_X = 20;
const PADDING_Y = 12;
const LINE_HEIGHT_MULTIPLIER = 1.3;

interface InlineTextEditorProps {
    nodeId: string | null;
    stageRef: React.RefObject<Konva.Stage>;
    onStopEditing: (save: boolean, newText?: string) => void;
}

const InlineTextEditor: React.FC<InlineTextEditorProps> = ({ nodeId, stageRef, onStopEditing }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [currentText, setCurrentText] = useState('');

    const { node, allNodes } = useEditorStore(
        useCallback(
            (state) => ({
                node: state.nodes.find(n => n.id === nodeId),
                allNodes: state.nodes
            }),
            [nodeId]
        )
    );

    const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);
    const level = useMemo(() => node ? calculateLevel(node.id, nodeMap) : 0, [node, nodeMap]);
   
    const baseStyle = useMemo(() => getNodeStyle(level), [level]);
    const finalStyle = useMemo(() => ({
        ...baseStyle,
        ...(node?.style || {})
    }), [baseStyle, node?.style]);

    const { width, height, finalFontSize } = useMemo(
        () => calculateNodeDimensions(node?.text ?? '', finalStyle),
        [node?.text, finalStyle]
    );

    const positionStyle = useMemo(() => {
        if (!node || !stageRef.current) return { display: 'none' };
       
        const stage = stageRef.current;
        const stageContainer = stage.container();
        if(!stageContainer) return { display: 'none' };
        const stageRect = stageContainer.getBoundingClientRect();
       
        const absPos = stage.getAbsoluteTransform().point({ x: node.x, y: node.y });
        return {
            display: 'block',
            position: 'absolute' as const,
            left: `${stageRect.left + absPos.x - width / 2}px`,
            top: `${stageRect.top + absPos.y - height / 2}px`,
            width: `${width}px`,
            minHeight: `${height}px`,
            fontSize: `${finalFontSize}px`,
            fontWeight: finalStyle.fontWeight,
            lineHeight: `${LINE_HEIGHT_MULTIPLIER}`,
            padding: `${PADDING_Y}px ${PADDING_X}px`,
            color: finalStyle.textColor,
        };
    }, [node, stageRef, finalStyle, width, height, finalFontSize]);

    useEffect(() => {
        if (node) {
            setCurrentText(node.text);
        }
    }, [node]);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (nodeId && textarea) {
            textarea.focus();
            textarea.select();
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [nodeId]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onStopEditing(true, currentText);
        } else if (e.key === 'Escape') {
            onStopEditing(false);
        }
    }, [onStopEditing, currentText]);

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