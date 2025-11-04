/**
 * Panel (Sidebar) để định dạng Node.
 * Tái cấu trúc từ `features/editor/FormattingToolbar.tsx` cũ.
 * GIỮ NGUYÊN GIAO DIỆN 100%.
 * SỬA: Thêm logic kết nối với Zustand store (User Story #14, #15).
 */
import React, { useMemo, useCallback } from 'react';
import { useEditorStore, NodeStyle } from '../../store/useEditorStore';
import { X, Palette, Type, Baseline, Minus, Plus, Bold, Italic, Square, Circle as CircleIcon, RefreshCcw } from 'lucide-react';
import { calculateLevel, getNodeStyle } from '../../../../core/utils/helpers';
import Button from '../../../../core/components/Button/Button';

const colorPalette = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];
const fontSizes = [{ name: 'Nhỏ', value: 12 }, { name: 'Vừa', value: 14 }, { name: 'Lớn', value: 18 }];
const fontFamilies = ['Inter', 'Roboto', 'Source Code Pro'];

interface StylePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const Label: React.FC<{ icon: React.ReactNode, text: string, onReset?: () => void, hasOverride?: boolean }> =
    ({ icon, text, onReset, hasOverride }) => (
    <div className="flex justify-between items-center mb-2">
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

const StylePanel: React.FC<StylePanelProps> = ({ isOpen, onClose }) => {
    const { selectedNodeId, nodes, updateNodeStyle } = useEditorStore(state => ({
        selectedNodeId: state.selectedNodeId,
        nodes: state.nodes,
        updateNodeStyle: state.updateNodeStyle,
    }));

    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
    const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
    const level = useMemo(() => selectedNode ? calculateLevel(selectedNode.id, nodeMap) : 0, [selectedNode, nodeMap]);
    const defaultStyle = useMemo(() => getNodeStyle(level), [level]);
    const currentStyleOverride = selectedNode?.style || {};
    const finalStyle = useMemo(() => ({
        ...defaultStyle,
        ...currentStyleOverride
    }), [defaultStyle, currentStyleOverride]);
    const isDisabled = !selectedNodeId;

    const handleStyleChange = useCallback((key: keyof NodeStyle, value: any) => {
        if (selectedNodeId) updateNodeStyle(selectedNodeId, { [key]: value });
    }, [selectedNodeId, updateNodeStyle]);

    const resetStyle = useCallback((key: keyof NodeStyle) => {
        if (selectedNodeId) updateNodeStyle(selectedNodeId, { [key]: undefined });
    }, [selectedNodeId, updateNodeStyle]);

    const toggleBold = useCallback(() => {
        if (selectedNodeId) {
            const newWeight = finalStyle.fontWeight === 'bold' ? 'normal' : 'bold';
            handleStyleChange('fontWeight', newWeight === defaultStyle.fontWeight ? undefined : newWeight);
        }
    }, [selectedNodeId, finalStyle.fontWeight, defaultStyle.fontWeight, handleStyleChange]);

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
         const newSize = parseInt(e.target.value, 10);
         handleStyleChange('fontSize', newSize === defaultStyle.fontSize ? undefined : newSize);
    };

    return (
        <div className={`absolute top-14 right-0 h-[calc(100vh-3.5rem)] w-64 bg-gray-900/90 backdrop-blur-md border-l border-gray-700 p-4 text-white z-30 transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                <h3 className="text-lg font-semibold">Định dạng Node</h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700">
                    <X size={20} />
                </button>
            </div>

            {!selectedNodeId ? (
                 <p className="text-sm text-gray-500 text-center py-4">Chọn một node để định dạng.</p>
            ) : (
                <div className={`space-y-4 ${isDisabled ? 'opacity-50' : ''}`}>
                    <div>
                        <Label icon={<Palette size={14} />} text="Màu sắc" onReset={() => resetStyle('backgroundColor')} hasOverride={!!currentStyleOverride.backgroundColor} />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {colorPalette.map(color => (
                                <button
                                    key={color}
                                    style={{ backgroundColor: color }}
                                    className={`w-6 h-6 rounded-full ring-2 transition-all ${
                                        finalStyle.backgroundColor === color ? 'ring-white ring-offset-2 ring-offset-gray-900' : 'ring-transparent hover:ring-white/50'
                                    }`}
                                    onClick={() => handleStyleChange('backgroundColor', color)}
                                    disabled={isDisabled}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label icon={<Type size={14} />} text="Kiểu chữ" />
                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                variant={finalStyle.fontWeight === 'bold' ? 'outline' : 'ghost'}
                                size="sm"
                                onClick={toggleBold}
                                disabled={isDisabled}
                                className={`flex-1 justify-center ${finalStyle.fontWeight === 'bold' ? '!bg-gray-700 !text-white' : ''}`}
                            >
                                <Bold size={16} />
                            </Button>
                             <Button
                                variant={'ghost'}
                                size="sm"
                                disabled={true}
                                className="flex-1 justify-center opacity-50 cursor-not-allowed"
                            >
                                <Italic size={16} />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label icon={<Baseline size={14} />} text="Cỡ chữ" onReset={() => resetStyle('fontSize')} hasOverride={!!currentStyleOverride.fontSize} />
                        <select
                            value={finalStyle.fontSize}
                            onChange={handleFontSizeChange}
                            disabled={isDisabled}
                            className="w-full bg-gray-700 rounded-md p-2 mt-1 border border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {fontSizes.map(f => (
                                <option key={f.value} value={f.value}>{f.name} ({f.value}px)</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label icon={<Type size={14} />} text="Font chữ" />
                        <select
                            disabled={true}
                            className="w-full bg-gray-700 rounded-md p-2 mt-1 border border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {fontFamilies.map(f => (
                                <option key={f}>{f}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StylePanel;