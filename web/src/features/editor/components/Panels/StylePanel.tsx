/**
 * Panel (Sidebar) để định dạng Node.
 * Tái cấu trúc từ `FormattingToolbar.tsx`.
 * Tuân thủ User Story #14 (Màu), #15 (Đậm, Nghiêng), và các yêu cầu style (font, shape).
 */
import React, { useMemo, useCallback } from 'react';
import { useEditorStore, NodeStyle } from '../../store/useEditorStore';
import { Bold, Italic, Type, Palette, Baseline, Minus, Plus, Square, Circle as CircleIcon, RefreshCcw } from 'lucide-react';
import { calculateLevel, getNodeStyle } from '../../../../core/utils/helpers';
import Button from '../../../../core/components/Button/Button';

// Bảng màu (User Story #14)
const colorPalette = [
    { name: 'Xám', value: '#6b7280' }, { name: 'Đỏ', value: '#ef4444' },
    { name: 'Cam', value: '#f97316' }, { name: 'Vàng', value: '#eab308' },
    { name: 'Chanh', value: '#84cc16' }, { name: 'Lục', value: '#22c55e' },
    { name: 'Lam', value: '#06b6d4' }, { name: 'Xanh', value: '#3b82f6' },
    { name: 'Tím', value: '#8b5cf6' }, { name: 'Hồng', value: '#ec4899' },
];

const StylePanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    
    const { selectedNodeId, nodes, updateNodeStyle } = useEditorStore(state => ({
        selectedNodeId: state.selectedNodeId,
        nodes: state.nodes,
        updateNodeStyle: state.updateNodeStyle,
    }));

    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
    const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
    const level = useMemo(() => selectedNode ? calculateLevel(selectedNode.id, nodeMap) : 0, [selectedNode, nodeMap]);
    
    // Style mặc định theo level
    const defaultStyle = useMemo(() => getNodeStyle(level), [level]);
    // Style ghi đè của node
    const currentStyleOverride = selectedNode?.style || {};
    // Style cuối cùng được render
    const finalStyle = useMemo(() => ({
        ...defaultStyle,
        ...currentStyleOverride
    }), [defaultStyle, currentStyleOverride]);

    const isDisabled = !selectedNodeId;

    // --- Handlers ---
    const handleStyleChange = useCallback((key: keyof NodeStyle, value: any) => {
        if (selectedNodeId) {
            updateNodeStyle(selectedNodeId, { [key]: value });
        }
    }, [selectedNodeId, updateNodeStyle]);

    // Xóa một thuộc tính style, quay về mặc định theo level
    const resetStyle = useCallback((key: keyof NodeStyle) => {
        if (selectedNodeId) {
            updateNodeStyle(selectedNodeId, { [key]: undefined });
        }
    }, [selectedNodeId, updateNodeStyle]);

    // User Story #15: Bold
    const toggleBold = useCallback(() => {
        if (selectedNodeId) {
            const newWeight = finalStyle.fontWeight === 'bold' ? 'normal' : 'bold';
            handleStyleChange('fontWeight', newWeight === defaultStyle.fontWeight ? undefined : newWeight);
        }
    }, [selectedNodeId, finalStyle.fontWeight, defaultStyle.fontWeight, handleStyleChange]);
    
    // User Story #15: Italic (Chưa hỗ trợ render, nhưng logic đã có)
    const toggleItalic = useCallback(() => {
        // TODO: Cần cập nhật Node.tsx để render fontStyle="italic"
        if (selectedNodeId) {
            // const newStyle = (currentStyleOverride.fontStyle === 'italic' ? 'normal' : 'italic');
            // handleStyleChange('fontStyle', newStyle === 'normal' ? undefined : newStyle);
             useEditorStore.getState().addToast("Chức năng In nghiêng đang phát triển", "info");
        }
    }, [selectedNodeId, handleStyleChange]);

    const changeFontSize = useCallback((amount: number) => {
        if (selectedNodeId) {
            const currentSize = finalStyle.fontSize;
            const newSize = Math.max(10, Math.min(24, currentSize + amount)); // Giới hạn 10-24
            handleStyleChange('fontSize', newSize === defaultStyle.fontSize ? undefined : newSize);
        }
    }, [selectedNodeId, finalStyle.fontSize, defaultStyle.fontSize, handleStyleChange]);

    const setShape = useCallback((shape: 'rectangle' | 'ellipse') => {
        if (selectedNodeId) {
             handleStyleChange('shape', shape === defaultStyle.shape ? undefined : shape);
        }
    }, [selectedNodeId, defaultStyle.shape, handleStyleChange]);

    return (
        <div
            className={`fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-64 bg-gray-900/90 backdrop-blur-md border-l border-gray-700/50 p-4 z-30 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            aria-hidden={!isOpen}
        >
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-base font-semibold text-gray-200">
                    Định dạng Node
                 </h3>
                 <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-gray-400">
                     <X size={18} />
                 </Button>
            </div>
           

            {!isNodeSelected ? (
                 <p className="text-sm text-gray-500 text-center py-4">Chọn một node để định dạng.</p>
            ) : (
                <div className="space-y-5 overflow-y-auto h-[calc(100%-40px)] pr-1">
                    {/* Màu nền (User Story #14) */}
                    <div>
                        <Label icon={<Palette size={14} />} text="Màu nền" onReset={() => resetStyle('backgroundColor')} hasOverride={!!currentStyleOverride.backgroundColor} />
                        <div className="flex flex-wrap gap-2 pt-2">
                            {colorPalette.map(({ name, value }) => (
                                <button
                                    key={value}
                                    onClick={() => handleStyleChange('backgroundColor', value)}
                                    className={`w-6 h-6 rounded-full ring-2 transition-all
                                        ${finalStyle.backgroundColor === value ? 'ring-white ring-offset-2 ring-offset-gray-900' : 'ring-transparent hover:ring-white/50'}`}
                                    style={{ backgroundColor: value }}
                                    title={name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Kiểu chữ (User Story #15) */}
                    <div>
                         <Label icon={<Type size={14} />} text="Kiểu chữ" />
                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                variant={finalStyle.fontWeight === 'bold' ? 'outline' : 'ghost'}
                                size="sm"
                                onClick={toggleBold}
                                className={`flex-1 justify-center ${finalStyle.fontWeight === 'bold' ? '!bg-gray-700 !text-white' : ''}`}
                                title="In đậm (Ctrl+B)"
                            >
                                <Bold size={16} />
                            </Button>
                             <Button
                                variant={'ghost'}
                                size="sm"
                                onClick={toggleItalic}
                                className="flex-1 justify-center opacity-50 cursor-not-allowed" // Tạm thời disable Italic
                                title="In nghiêng (Ctrl+I)"
                                disabled
                            >
                                <Italic size={16} />
                            </Button>
                        </div>
                    </div>

                    {/* Cỡ chữ */}
                    <div>
                        <Label icon={<Baseline size={14} />} text="Cỡ chữ" onReset={() => resetStyle('fontSize')} hasOverride={!!currentStyleOverride.fontSize} />
                        <div className="flex items-center gap-2 pt-2 bg-gray-800 border border-gray-700 rounded-md p-1">
                            <Button variant="ghost" size="sm" onClick={() => changeFontSize(-1)} className="!p-1 h-auto"><Minus size={14} /></Button>
                            <span className="text-sm text-center flex-1 tabular-nums text-white">{finalStyle.fontSize}px</span>
                            <Button variant="ghost" size="sm" onClick={() => changeFontSize(1)} className="!p-1 h-auto"><Plus size={14} /></Button>
                        </div>
                    </div>

                    {/* Hình dạng (Level 0 là Ellipse, còn lại là Rect) */}
                    <div>
                         <Label icon={<Square size={14} />} text="Hình dạng" onReset={() => resetStyle('shape')} hasOverride={!!currentStyleOverride.shape} />
                        <div className="flex items-center gap-2 pt-2">
                             <Button
                                variant={finalStyle.shape === 'rectangle' ? 'outline' : 'ghost'}
                                size="sm"
                                onClick={() => setShape('rectangle')}
                                disabled={selectedNodeId === 'root'} // Root node (level 0) luôn là Ellipse
                                className={`flex-1 justify-center ${finalStyle.shape === 'rectangle' ? '!bg-gray-700 !text-white' : ''} ${selectedNodeId === 'root' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Square size={16} />
                            </Button>
                             <Button
                                variant={finalStyle.shape === 'ellipse' ? 'outline' : 'ghost'}
                                size="sm"
                                onClick={() => setShape('ellipse')}
                                disabled={selectedNodeId === 'root'}
                                className={`flex-1 justify-center ${finalStyle.shape === 'ellipse' ? '!bg-gray-700 !text-white' : ''} ${selectedNodeId === 'root' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <CircleIcon size={16} />
                            </Button>
                        </div>
                    </div>
                    {/* Thêm các tùy chọn khác ở đây (Border color, Text color...) */}
                </div>
            )}
        </div>
    );
};

// Component Label nội bộ
const Label: React.FC<{ icon: React.ReactNode, text: string, onReset?: () => void, hasOverride?: boolean }> = 
    ({ icon, text, onReset, hasOverride }) => (
    <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
            {icon} {text}
        </label>
        {onReset && hasOverride && (
             <Button variant="ghost" size="icon" onClick={onReset} title="Reset về mặc định" className="h-6 w-6 text-gray-500 hover:text-white">
                <RefreshCcw size={14} />
            </Button>
        )}
    </div>
);

export default StylePanel;
