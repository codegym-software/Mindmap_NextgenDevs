import React, { useState, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import {
    ChevronDown, ChevronUp, ChevronsUpDown, Check,
    AlignCenter, AlignLeft, AlignRight,
    Bold, Italic, Underline, Strikethrough, CaseSensitive, CaseLower, CaseUpper,
    Copy, ClipboardPaste, RotateCcw,
    Palette, Square, Circle, Diamond, Minus,
    ArrowRight, GitBranch, GitCommit, GitMerge, Type,
    LayoutGrid, LayoutList, Layout,
    Binary,
    Users,
    Paintbrush,
    Type as TextIcon
} from 'lucide-react';
import {
    useEditorStore, NodeData, GlobalStructure, QuickStyleId,
    ColorTheme,
    colorThemes,
    fonts,
    getNodeComputedStyle,
    applyNodeDefaults,
} from '../../app/store/useEditorStore';

// =================================================================================
// Props
// =================================================================================
type FormattingToolbarProps = {
    selectedIds: string[];
    currentNode: NodeData | null;
    currentBackgroundColor: string;
    globalStructure: GlobalStructure;
    activeColorThemeId: keyof typeof colorThemes;

    onApplyLayout: (structure: GlobalStructure) => void;
    onSetBackgroundColor: (color: string) => void;
    onSetGlobalFont: (font: string) => void;
    onSetBranchLineWidth: (width: number) => void;
    onToggleColoredBranch: (state: boolean) => void;
    onSetGlobalBranchColor: (color: string) => void;
    onSetActiveColorTheme: (themeName: keyof typeof colorThemes) => void;

    onUpdateNode: (updates: Partial<NodeData>) => void;
    onApplyQuickStyle: (styleId: QuickStyleId) => void;
    onCopyStyle: () => void;
    onPasteStyle: () => void;
    onResetStyle: () => void;
    onLayoutAll?: () => void;
};

// =================================================================================
// Constants
// =================================================================================
const INPUT_BG = "bg-gray-100 hover:bg-gray-200";
const BUTTON_BG = "bg-gray-100 hover:bg-gray-200";
const BUTTON_ACTIVE_BG = "bg-gray-300";

// =================================================================================
// Main Component
// =================================================================================
export default function FormattingToolbar({
                                              selectedIds,
                                              currentNode,
                                              currentBackgroundColor,
                                              globalStructure,
                                              activeColorThemeId,
                                              onApplyLayout,
                                              onSetBackgroundColor,
                                              onSetGlobalFont,
                                              onSetBranchLineWidth,
                                              onToggleColoredBranch,
                                              onSetGlobalBranchColor,
                                              onSetActiveColorTheme,
                                              onUpdateNode,
                                              onApplyQuickStyle,
                                              onCopyStyle,
                                              onPasteStyle,
                                              onResetStyle,
                                              onLayoutAll,
                                          }: FormattingToolbarProps) {
    const [activeTab, setActiveTab] = useState<'style' | 'map'>('map');
    const activeTheme = colorThemes[activeColorThemeId];

    const isDisabled = useMemo(() => {
        if (selectedIds.length === 0) return true;
        return false;
    }, [selectedIds]);

    useEffect(() => {
        if (isDisabled) {
            setActiveTab('map');
        } else {
            setActiveTab('style');
        }
    }, [isDisabled]);

    return (
        <div className="fixed top-12 right-0 h-[calc(100vh-3rem)] bg-white border-l border-gray-200 shadow-sm z-30 flex flex-col text-gray-700" style={{ width: '280px', fontFamily: 'Arial' }}>
            {/* 1. Header (Tabs) */}
            <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} isDisabled={isDisabled} />

            {/* 2. Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'style' && (
                    <NodeStylePanel
                        selectedIds={selectedIds}
                        currentNode={currentNode}
                        activeTheme={activeTheme}
                        onUpdateNode={onUpdateNode}
                        onApplyQuickStyle={onApplyQuickStyle}
                        onCopyStyle={onCopyStyle}
                        onPasteStyle={onPasteStyle}
                        onResetStyle={onResetStyle}
                    />
                )}
                {activeTab === 'map' && (
                    <MapPanel
                        globalStructure={globalStructure}
                        onApplyLayout={onApplyLayout}
                        currentBackgroundColor={currentBackgroundColor}
                        onSetBackgroundColor={onSetBackgroundColor}
                        activeColorThemeId={activeColorThemeId}
                        onSetActiveColorTheme={onSetActiveColorTheme}
                        onSetGlobalFont={onSetGlobalFont}
                        onSetBranchLineWidth={onSetBranchLineWidth}
                        onToggleColoredBranch={onToggleColoredBranch}
                        onSetGlobalBranchColor={onSetGlobalBranchColor}
                        onLayoutAll={onLayoutAll}
                    />
                )}
            </div>
        </div>
    );
}

// =================================================================================
// Tab Header
// =================================================================================
type TabHeaderProps = {
    activeTab: 'style' | 'map';
    setActiveTab: (tab: 'style' | 'map') => void;
    isDisabled: boolean;
};

function TabHeader({ activeTab, setActiveTab, isDisabled }: TabHeaderProps) {
    return (
        <div className="flex border-b border-gray-200 bg-gray-50">
            <TabButton
                label="Style"
                isActive={activeTab === 'style'}
                onClick={() => setActiveTab('style')}
                disabled={isDisabled}
            />
            <TabButton
                label="Map"
                isActive={activeTab === 'map'}
                onClick={() => setActiveTab('map')}
            />
        </div>
    );
}

// =================================================================================
// Tab "Map" (Cài đặt toàn cục)
// =================================================================================
type MapPanelProps = {
    globalStructure: GlobalStructure;
    onApplyLayout: (structure: GlobalStructure) => void;
    currentBackgroundColor: string;
    onSetBackgroundColor: (color: string) => void;
    activeColorThemeId: keyof typeof colorThemes;
    onSetActiveColorTheme: (themeName: keyof typeof colorThemes) => void;
    onSetGlobalFont: (font: string) => void;
    onSetBranchLineWidth: (width: number) => void;
    onToggleColoredBranch: (state: boolean) => void;
    onSetGlobalBranchColor: (color: string) => void;
    onLayoutAll?: () => void;
};

function MapPanel({
                      globalStructure,
                      onApplyLayout,
                      currentBackgroundColor,
                      onSetBackgroundColor,
                      activeColorThemeId,
                      onSetActiveColorTheme,
                      onSetGlobalFont,
                      onSetBranchLineWidth,
                      onToggleColoredBranch,
                      onSetGlobalBranchColor,
                      onLayoutAll,
                  }: MapPanelProps) {
    const currentFont = useEditorStore((s) => s.globalFont);
    const currentLineWidth = useEditorStore((s) => s.branchLineWidth);
    const globalBranchColor = useEditorStore((s) => s.globalBranchColor);

    return (
        <div className="p-4 space-y-4">
            {/* 1. Layout toàn cục */}
            <button
                onClick={onLayoutAll}
                className={`w-full py-2 rounded-lg text-gray font-medium bg-gradient-to-r from-purple-100 to-blue-100 hover:from-blue-200 hover:to-purple-200 transition-all flex items-center justify-center gap-2`}
            >
                {/* <Layout size={19} /> */}
                Layout toàn bộ
            </button>

            {/* 2. Cấu trúc */}
            <RowItem label="Cấu trúc">
                <div className="flex justify-between gap-1 w-full">
                    <StructureButton
                        label={<img src="/icons/mindmap.png" alt="Mindmap" className="w-6 h-6" />}
                        isActive={globalStructure === 'mindmap'}
                        onClick={() => onApplyLayout('mindmap')}
                    />
                    <StructureButton
                        label={<img src="/icons/logic.png" alt="Logic" className="w-6 h-6" />}
                        isActive={globalStructure === 'logic'}
                        onClick={() => onApplyLayout('logic')}
                    />
                    <StructureButton
                        label={<img src="/icons/org.png" alt="Org" className="w-6 h-6" />}
                        isActive={globalStructure === 'org'}
                        onClick={() => onApplyLayout('org')}
                    />
                </div>
            </RowItem>

            {/* 3. Màu nền */}
            <ColorItem
                label="Màu nền"
                color={currentBackgroundColor}
                onChange={onSetBackgroundColor}
            />

            {/* 4. Phông chữ toàn cục */}
            <RowItem label="Phông chữ">
                <CustomSelect value={currentFont} onChange={onSetGlobalFont}>
                    {fonts.map((font) => (
                        <Option key={font.value} value={font.value}>
                            <span style={{ fontFamily: font.value }}>{font.name}</span>
                        </Option>
                    ))}
                </CustomSelect>
            </RowItem>

            {/* 5. Nhánh */}
            <ColorItem
                label="Nhánh"
                color={globalBranchColor}
                onChange={onSetGlobalBranchColor}
            >
                <div className="w-20">
                    <CustomSelect
                        value={String(currentLineWidth)}
                        onChange={(width) => onSetBranchLineWidth(Number(width))}
                    >
                        <Option value="1">Mỏng</Option>
                        <Option value="2">Vừa</Option>
                        <Option value="3">Dày</Option>
                    </CustomSelect>
                </div>
            </ColorItem>
        </div>
    );
}

// =================================================================================
// Tab "Style" (Cài đặt Node)
// =================================================================================
type NodeStylePanelProps = {
    selectedIds: string[];
    currentNode: NodeData | null;
    activeTheme: ColorTheme;
    onUpdateNode: (updates: Partial<NodeData>) => void;
    onApplyQuickStyle: (styleId: QuickStyleId) => void;
    onCopyStyle: () => void;
    onPasteStyle: () => void;
    onResetStyle: () => void;
};

function NodeStylePanel({
                            selectedIds,
                            currentNode,
                            activeTheme,
                            onUpdateNode,
                            onApplyQuickStyle,
                            onCopyStyle,
                            onPasteStyle,
                            onResetStyle,
                        }: NodeStylePanelProps) {

    const computedStyle = useMemo(() => {
        return getNodeComputedStyle(currentNode, activeTheme, useEditorStore.getState().globalFont);
    }, [currentNode, activeTheme]);

    const style = useMemo(() => {
        if (!currentNode) return computedStyle;

        return {
            ...computedStyle,
            fontFamily: currentNode.fontFamily ?? computedStyle.fontFamily,
            fontSize: currentNode.fontSize ?? computedStyle.fontSize,
            fontWeight: currentNode.fontWeight ?? computedStyle.fontWeight,
            fontStyle: currentNode.fontStyle ?? computedStyle.fontStyle,
            textDecoration: currentNode.textDecoration ?? computedStyle.textDecoration,
            textAlign: currentNode.textAlign ?? computedStyle.textAlign,
            textColor: currentNode.textColor ?? computedStyle.textColor,
            textCase: currentNode.textCase ?? computedStyle.textCase,
            color: currentNode.color ?? computedStyle.color,
            borderColor: currentNode.borderColor ?? computedStyle.borderColor,
            borderWidth: currentNode.borderWidth ?? computedStyle.borderWidth,
            borderStyle: currentNode.borderStyle ?? computedStyle.borderStyle,
            branchLineThickness: currentNode.branchLineThickness ?? computedStyle.branchLineThickness,
            branchLineStyle: currentNode.branchLineStyle ?? computedStyle.branchLineStyle,
            branchLineEnd: currentNode.branchLineEnd ?? computedStyle.branchLineEnd,
            branchColor: currentNode.branchColor ?? computedStyle.branchColor,
        };
    }, [currentNode, computedStyle]);

    const [localLength, setLocalLength] = useState<number | string>(style.nodeLength || 'fit');

    useEffect(() => {
        setLocalLength(style.nodeLength || 'fit');
    }, [style.nodeLength]);


    const handleUpdate = (updates: Partial<NodeData>) => {
        if (selectedIds.length > 0) {
            const mergedUpdates = { ...updates };
            onUpdateNode(mergedUpdates);
        }
    };

    return (
        <div className="p-4 space-y-1">
            {/* 1. Kiểu nhanh */}
            {selectedIds.length > 0 && !(selectedIds.length === 1 && selectedIds[0] === 'root') && (
                <CollapsiblePanel label="Kiểu nhanh" defaultOpen>
                    <div className="grid grid-cols-2 gap-2">
                        <QuickStyleButton
                            label="Rất quan trọng"
                            styleId="important-dark"
                            activeTheme={activeTheme}
                            onClick={() => onApplyQuickStyle('important-dark')}
                        />
                        <QuickStyleButton
                            label="Quan trọng"
                            styleId="important-light"
                            activeTheme={activeTheme}
                            onClick={() => onApplyQuickStyle('important-light')}
                        />
                        <QuickStyleButton
                            label="Gạch bỏ"
                            styleId="strikethrough"
                            activeTheme={activeTheme}
                            onClick={() => onApplyQuickStyle('strikethrough')}
                        />
                        <QuickStyleButton
                            label="Mặc định"
                            styleId="default"
                            activeTheme={activeTheme}
                            onClick={() => onApplyQuickStyle('default')}
                        />
                    </div>
                </CollapsiblePanel>
            )}

            {/* 2. Hình dạng */}
            <CollapsiblePanel label="Hình dạng" defaultOpen>
                <ColorItem
                    label="Hình dạng"
                    color={style.color || '#FFFFFF'}
                    onChange={(color) => handleUpdate({ color })}
                >
                    <div className="w-[83px]">
                        <CustomSelect
                            value={style.shape}
                            onChange={(shape) => handleUpdate({ shape: shape as NodeData['shape'] })}
                        >
                            <Option value="roundedRect">Bo góc</Option>
                            <Option value="rectangle">Vuông</Option>
                            <Option value="underline">Gạch dưới</Option>
                        </CustomSelect>
                    </div>
                </ColorItem>
                <ColorItem
                    label="Viền"
                    color={style.borderColor || '#CCCCCC'}
                    onChange={(borderColor) => handleUpdate({ borderColor })}
                >
                    <div className="w-[83px]">
                        <CustomSelect
                            value={style.borderStyle}
                            onChange={(borderStyle) => handleUpdate({ borderStyle: borderStyle as NodeData['borderStyle'] })}
                        >
                            <Option value="solid">Liền</Option>
                            <Option value="dashed">Đứt</Option>
                            <Option value="dotted">Chấm</Option>
                        </CustomSelect>
                    </div>
                </ColorItem>
                <RowItem label="">
                    <CustomSelect
                        value={String(style.borderWidth)}
                        onChange={(borderWidth) => handleUpdate({ borderWidth: Number(borderWidth) })}
                    >
                        <Option value="0">Không</Option>
                        <Option value="2">Mỏng</Option>
                        <Option value="4">Dày</Option>
                    </CustomSelect>
                </RowItem>
                <RowItem label="Độ dài">
                    <div className="flex items-center gap-1 w-full">
                        <input
                            type="text"
                            value={localLength === 'fit' ? '' : String(localLength)}
                            placeholder="Fit"
                            onKeyDown={(e) => {
                                // Prevent global Enter shortcuts (e.g., add sibling) while typing length
                                e.stopPropagation();
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={(e) => {
                                let val: number | 'fit' = parseInt(e.target.value);
                                if (isNaN(val) || e.target.value === '') {
                                    val = 'fit';
                                } else if (val < 80) {
                                    val = 80;
                                }
                                setLocalLength(val);
                                handleUpdate({ nodeLength: val });
                            }}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                setLocalLength(raw === '' ? 'fit' : Number(raw));
                            }}
                            className={`w-full flex-1 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                        />
                        <button
                            onClick={() => {
                                setLocalLength('fit');
                                handleUpdate({ nodeLength: 'fit' as any });
                            }}
                            className={`p-1.5 rounded text-sm ${
                                style.nodeLength === 'fit' ? BUTTON_ACTIVE_BG : BUTTON_BG
                            }`}
                        >
                            Fit
                        </button>
                    </div>
                </RowItem>
            </CollapsiblePanel>

            <CollapsiblePanel label="Văn bản" defaultOpen>
                <ColorItem
                    label="Cỡ chữ"
                    color={style.textColor || '#333333'}
                    onChange={(textColor) => handleUpdate({ textColor })}
                >
                    <input
                        type="number"
                        min={8}
                        max={72}
                        value={style.fontSize}
                        onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
                        className={`w-20 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
                    />
                </ColorItem>
                <RowItem label="Phông chữ">
                    <CustomSelect
                        value={style.fontFamily}
                        onChange={(fontFamily) => handleUpdate({ fontFamily })}
                    >
                        {fonts.map((font) => (
                            <Option key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }}>{font.name}</span>
                            </Option>
                        ))}
                    </CustomSelect>
                </RowItem>
                <div className="grid grid-cols-4 gap-1">
                    <TextFormatButton
                        icon={<Bold size={16} />}
                        isActive={style.fontWeight === 'bold'}
                        onClick={() =>
                            handleUpdate({
                                fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold',
                            })
                        }
                    />
                    <TextFormatButton
                        icon={<Italic size={16} />}
                        isActive={style.fontStyle === 'italic'}
                        onClick={() =>
                            handleUpdate({
                                fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic',
                            })
                        }
                    />
                    <TextFormatButton
                        icon={<Underline size={16} />}
                        isActive={style.textDecoration === 'underline'}
                        onClick={() => {
                            if (style.textDecoration === 'underline') {
                                handleUpdate({ textDecoration: 'none' });
                            } else {
                                handleUpdate({ textDecoration: 'underline' });
                            }
                        }}
                    />
                    <TextFormatButton
                        icon={<Strikethrough size={16} />}
                        isActive={style.textDecoration === 'line-through'}
                        onClick={() => {
                            if (style.textDecoration === 'line-through') {
                                handleUpdate({ textDecoration: 'none' });
                            } else {
                                handleUpdate({ textDecoration: 'line-through' });
                            }
                        }}
                    />
                </div>
                <div className="grid grid-cols-4 gap-1">
                    <TextFormatButton
                        icon={<AlignLeft size={16} />}
                        isActive={style.textAlign === 'LEFT'}
                        onClick={() => handleUpdate({ textAlign: 'LEFT' })}
                    />
                    <TextFormatButton
                        icon={<AlignCenter size={16} />}
                        isActive={style.textAlign === 'CENTER'}
                        onClick={() => handleUpdate({ textAlign: 'CENTER' })}
                    />
                    <TextFormatButton
                        icon={<AlignRight size={16} />}
                        isActive={style.textAlign === 'RIGHT'}
                        onClick={() => handleUpdate({ textAlign: 'RIGHT' })}
                    />
                    <TextFormatButton
                        icon={
                            style.textCase === 'lowercase' ? <CaseLower size={16} /> :
                                style.textCase === 'uppercase' ? <CaseUpper size={16} /> :
                                    <CaseSensitive size={16} />
                        }
                        isActive={style.textCase !== 'normal'}
                        onClick={() => {
                            const nextCase =
                                style.textCase === 'normal'
                                    ? 'uppercase'
                                    : style.textCase === 'uppercase'
                                        ? 'lowercase'
                                        : 'normal';
                            handleUpdate({ textCase: nextCase as NodeData['textCase'] });
                        }}
                    />
                </div>
            </CollapsiblePanel>

            {/* 5. Nhánh (con) */}
            <CollapsiblePanel label="Kiểu nhánh" defaultOpen>
                <RowItem label="Đường nối">
                    <div className="flex gap-2 items-center w-full">
                        <div className="flex-1">
                            <CustomSelect
                                value={style.branchLineStyle}
                                onChange={(branchLineStyle) => handleUpdate({ branchLineStyle: branchLineStyle as NodeData['branchLineStyle'] })}
                            >
                                <Option value="bezier">Cong</Option>
                                <Option value="sharp">Gấp</Option>
                            </CustomSelect>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={style.branchLineEnd === 'arrow'}
                                onChange={(e) => handleUpdate({ branchLineEnd: e.target.checked ? 'arrow' : 'none' })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">Mũi tên</span>
                        </label>
                    </div>
                </RowItem>
                <ColorItem
                    label="Màu nhánh"
                    color={style.branchColor || '#666666'}
                    onChange={(branchColor) => handleUpdate({ branchColor })}
                >
                    <div className="flex-1 w-20">
                        <CustomSelect
                            value={style.branchLineThickness}
                            onChange={(branchLineThickness) => handleUpdate({ branchLineThickness: branchLineThickness as NodeData['branchLineThickness'] })}
                        >
                            <Option value="thin">Mỏng</Option>
                            <Option value="normal">Vừa</Option>
                            <Option value="thick">Dày</Option>
                        </CustomSelect>
                    </div>
                </ColorItem>
            </CollapsiblePanel>

            {/* 6. Thao tác nhanh */}
            <CollapsiblePanel label="Thao tác" defaultOpen>
                <div className="grid grid-cols-3 gap-1">
                    <TextFormatButton icon={<Copy size={16} />} onClick={onCopyStyle} />
                    <TextFormatButton icon={<ClipboardPaste size={16} />} onClick={onPasteStyle} />
                    <TextFormatButton icon={<RotateCcw size={16} />} onClick={onResetStyle} />
                </div>
            </CollapsiblePanel>
        </div>
    );
}

// =================================================================================
// Components con (Helpers)
// =================================================================================

type TabButtonProps = {
    label: string;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
};

function TabButton({ label, isActive, onClick, disabled }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex-1 flex items-center justify_center gap-2 px-4 py-3 text-sm font-medium outline-none
        ${isActive ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            {label}
        </button>
    );
}

type StructureButtonProps = {
    label: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
};

function StructureButton({ label, isActive, onClick }: StructureButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center justify-center gap-2 p-2 rounded-md border-2 text-center
        ${isActive ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
        >
            <div className="flex items-center justify-center">
                {label}
            </div>
        </button>
    );
}

function RowItem({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 w-full">
            <label className="text-base font-medium text-gray-500 whitespace-nowrap min-w-[80px] mt-1">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

type ColorItemProps = {
    label: string;
    color: string;
    onChange: (color: string) => void;
    children?: React.ReactNode;
};

function ColorItem({ label, color, onChange, children }: ColorItemProps) {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [pickerRef]);

    const simpleColors = [
        '#FFFFFF', '#E2E8F0', '#94A3B8', '#475569', '#1E293B', '#000000',
        '#FECACA', '#F87171', '#DC2626', '#991B1B',
        '#FDE68A', '#FACC15', '#EAB308', '#A16207',
        '#A7F3D0', '#34D399', '#059669', '#065F46',
        '#BFDBFE', '#60A5FA', '#2563EB', '#1E40AF',
        '#D8B4FE', '#C084FC', '#A855F7', '#7E22CE',
    ];

    return (
        <div className="flex items-start gap-3 w-full relative">
            <label className="text-base font-medium text-gray-500 whitespace-nowrap min-w-[80px] mt-1">{label}</label>
            <div className="flex-1 flex items-center justify-between gap-2">
                {children}
                <button
                    className="flex-1 h-8 rounded border border-gray-400"
                    style={{ backgroundColor: color }}
                    onClick={() => setShowPicker(!showPicker)}
                />
            </div>
            {showPicker && (
                <div
                    ref={pickerRef}
                    className="absolute right-0 top-full mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-300 p-2 z-10"
                >
                    <div className="grid grid-cols-6 gap-1">
                        {simpleColors.map((c) => (
                            <button
                                key={c}
                                className="w-6 h-6 rounded-sm border border-gray-200 hover:scale-110 hover:shadow-md transition-transform"
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                    onChange(c);
                                    setShowPicker(false);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

type QuickStyleButtonProps = {
    label: string;
    styleId: QuickStyleId;
    activeTheme: ColorTheme;
    onClick: () => void;
};

function QuickStyleButton({ label, styleId, activeTheme, onClick }: QuickStyleButtonProps) {
    const style = getNodeComputedStyle({ quickStyleId: styleId } as NodeData, activeTheme, '');

    const computedFill = style?.color || '#FFFFFF';
    const computedStroke = style?.borderColor || '#CCCCCC';
    const computedTextColor = style.textColor || '#333333';

    return (
        <button
            onClick={onClick}
            className="p-2 rounded-md border text-center transition-all hover:shadow-md active:scale-95"
            style={{
                backgroundColor: computedFill,
                borderColor: computedStroke,
                color: computedTextColor,
                textDecoration: style.textDecoration === 'line-through' ? 'line-through' : 'none',
                fontWeight: style.fontWeight === 'bold' ? 'bold' : 'normal',
            }}
        >
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}

type TextFormatButtonProps = {
    icon: React.ReactNode;
    isActive?: boolean;
    onClick: () => void;
};

function TextFormatButton({ icon, isActive, onClick }: TextFormatButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-md ${isActive ? BUTTON_ACTIVE_BG : BUTTON_BG}`}
        >
            {icon}
        </button>
    );
}

type CustomSelectProps = {
    value: string | number | undefined;
    onChange: (value: string) => void;
    children: React.ReactNode;
};

function CustomSelect({ value, onChange, children }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selectedChild = React.Children.toArray(children).find(
        (child) => (child as React.ReactElement).props.value === value
    ) as React.ReactElement;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref]);

    return (
        <div className="relative w-full" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-1.5 ${INPUT_BG} rounded text-sm text-left flex items-center justify-between border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
            >
                <div className="flex-1 truncate">
                    {selectedChild ? selectedChild.props.children : 'Chọn...'}
                </div>
                <ChevronsUpDown size={16} className="text-gray-500" />
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 min-w-full w-max max-h-48 overflow-y-auto bg-white shadow-lg rounded-md border border-gray-300">
                    {React.Children.map(children, (child) => {
                        const childEl = child as React.ReactElement;
                        return React.cloneElement(childEl, {
                            onClick: () => {
                                onChange(childEl.props.value);
                                setIsOpen(false);
                            },
                            isActive: childEl.props.value === value,
                        });
                    })}
                </div>
            )}
        </div>
    );
}

type OptionProps = {
    value: string;
    children: React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
};

function Option({ value, children, onClick, isActive }: OptionProps) {
    return (
        <div
            onClick={onClick}
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between
        ${isActive ? 'font-medium text-blue-600' : 'text-gray-800'}
      `}
        >
            <div className="flex-1 truncate">{children}</div>
            {isActive && <Check size={16} className="text-blue-600" />}
        </div>
    );
}

type CollapsiblePanelProps = {
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
};

function CollapsiblePanel({ label, children, defaultOpen = true }: CollapsiblePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200 pb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded"
            >
                {label}
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && <div className="pt-2 space-y-3">{children}</div>}
        </div>
    );
}