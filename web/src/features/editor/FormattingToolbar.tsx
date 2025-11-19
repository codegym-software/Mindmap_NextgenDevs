import React, { useState, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import {
  ChevronDown, ChevronUp, ChevronsUpDown, Check,
  AlignCenter, AlignLeft, AlignRight,
  Bold, Italic, Underline, Strikethrough, CaseSensitive,
  Copy, ClipboardPaste, RotateCcw,
  Palette, Square, Circle, Diamond, Minus,
  ArrowRight, GitBranch, GitCommit, GitMerge, Type,
  LayoutGrid, LayoutList, Layout,
  Binary, // Sửa: Thay thế LogicTree
  Users, // Sửa: Thay thế Sitemap
  Paintbrush,
  Type as TextIcon // Sửa: Alias
} from 'lucide-react';
// SỬA: Đổi lại đường dẫn import sang tương đối
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
  // [SỬA] Thay đổi từ string sang mảng string
  selectedIds: string[]; 
  currentNode: NodeData | null; // Vẫn là node đầu tiên được chọn
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

  // [SỬA] Bỏ tham số 'id'
  onUpdateNode: (updates: Partial<NodeData>) => void; 
  onApplyQuickStyle: (styleId: QuickStyleId) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onResetStyle: () => void;
};

// =================================================================================
// Constants
// =================================================================================
const INPUT_BG = "bg-gray-100 hover:bg-gray-200";
const BUTTON_BG = "bg-gray-100 hover:bg-gray-200";
const BUTTON_ACTIVE_BG = "bg-blue-500 text-white";

// =================================================================================
// Main Component
// =================================================================================
export default function FormattingToolbar({
  selectedIds, // [SỬA]
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
  onUpdateNode, // [SỬA]
  onApplyQuickStyle,
  onCopyStyle,
  onPasteStyle,
  onResetStyle,
}: FormattingToolbarProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'map'>('map');
  const activeTheme = colorThemes[activeColorThemeId];
  
  // [SỬA] Logic cấm/tắt tab Style
  const isDisabled = useMemo(() => {
    if (selectedIds.length === 0) return true;
    return false;
  }, [selectedIds]);

  // [SỬA] Auto-switch tabs based on node selection
  useEffect(() => {
    if (isDisabled) {
      // Không có node nào được chọn HOẶC chỉ chọn 'root'
      setActiveTab('map');
    } else {
      // Có ít nhất một node (không phải root) được chọn
      setActiveTab('style');
    }
  }, [isDisabled]); // [SỬA] Dùng isDisabled làm dependency

  return (
    <div className="absolute top-11 right-0 h-[calc(100vh-2.75rem)] w-72 bg-white border-l border-gray-200 shadow-sm z-30 flex flex-col text-gray-700"> {/* Changed top-14 -> top-12 AND h-[calc(100vh-3.5rem)] -> h-[calc(100vh-3rem)] */}
      {/* 1. Header (Tabs) */}
      <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} isDisabled={isDisabled} />

      {/* 2. Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'style' && (
          <NodeStylePanel
            selectedIds={selectedIds} // [SỬA]
            currentNode={currentNode}
            activeTheme={activeTheme}
            onUpdateNode={onUpdateNode} // [SỬA]
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
            // [SỬA] Truyền prop fix lỗi từ bước trước
            onSetGlobalBranchColor={onSetGlobalBranchColor}
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
    <div className="flex justify-center border-b border-gray-200 bg-gray-50">
      <TabButton
        label="Style"
        isActive={activeTab === 'style'}
        onClick={() => setActiveTab('style')}
        disabled={isDisabled} // [SỬA] Logic cấm/tắt đã được cập nhật
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
  // [SỬA] Thêm prop
  onSetGlobalBranchColor: (color: string) => void;
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
  // [SỬA] Nhận prop
  onSetGlobalBranchColor,
}: MapPanelProps) {
  const currentFont = useEditorStore((s) => s.globalFont);
  const currentLineWidth = useEditorStore((s) => s.branchLineWidth);
  const isColored = useEditorStore((s) => s.isColoredBranch);
  const globalBranchColor = useEditorStore((s) => s.globalBranchColor);
  const activeTheme = colorThemes[activeColorThemeId];

  return (
    <div className="p-4 space-y-4">
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
        <CustomSelect
          value={currentFont}
          onChange={onSetGlobalFont}
        >
          {fonts.map((font) => (
            <Option key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.name}</span>
            </Option>
          ))}
        </CustomSelect>
      </RowItem>
      
      {/* 5. Độ dày nhánh */}
      <RowItem label="Độ dày nhánh">
        <select
          value={currentLineWidth}
          onChange={(e) => {
            onSetBranchLineWidth(Number(e.target.value));
          }}
          className={`flex-1 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
        >
          <option value={1}>Mỏng</option>
          <option value={2}>Vừa</option>
          <option value={4}>Dày</option>
        </select>
      </RowItem>
      {/* [SỬA] Cập nhật onChange để gọi prop mới */}
      <ColorItem
        label="Màu nhánh"
        color={globalBranchColor}
        onChange={onSetGlobalBranchColor}
      >
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={isColored}
            onChange={(e) => onToggleColoredBranch(e.target.checked)}
            className="rounded border-gray-300 cursor-pointer"
          />
          <span>Nhiều màu</span>
        </label>
      </ColorItem>
  
    </div>
  );
}

// =================================================================================
// Tab "Style" (Cài đặt Node)
// =================================================================================
type NodeStylePanelProps = {
  // [SỬA]
  selectedIds: string[];
  currentNode: NodeData | null;
  activeTheme: ColorTheme;
  // [SỬA]
  onUpdateNode: (updates: Partial<NodeData>) => void;
  onApplyQuickStyle: (styleId: QuickStyleId) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onResetStyle: () => void;
};
function NodeStylePanel({
  // [SỬA]
  selectedIds,
  currentNode,
  activeTheme,
  onUpdateNode,
  onApplyQuickStyle,
  onCopyStyle,
  onPasteStyle,
  onResetStyle,
}: NodeStylePanelProps) {
  
  // Tính toán style (vẫn dựa trên node đầu tiên)
  const style = useMemo(() => {
    return getNodeComputedStyle(currentNode, activeTheme, useEditorStore.getState().globalFont);
  }, [currentNode, activeTheme]);
  
  // State cục bộ cho "Độ dài" (vẫn dựa trên node đầu tiên)
  const [localLength, setLocalLength] = useState<number | string>(style.nodeLength || 'fit');
  
  useEffect(() => {
    // Cập nhật state cục bộ khi node thay đổi
    setLocalLength(style.nodeLength || 'fit');
  }, [style.nodeLength]);


  // [SỬA] Handler chung
  const handleUpdate = (updates: Partial<NodeData>) => {
    // onUpdateNode giờ đã xử lý mảng
    if (selectedIds.length > 0) {
      onUpdateNode(updates);
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
        <RowItem label="Hình dạng">
          <select
            value={style.shape}
            onChange={(e) => handleUpdate({ shape: e.target.value as NodeData['shape'] })}
            className={`flex-1 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          >
            <option value="roundedRect">Bo góc</option>
            <option value="rectangle">Vuông</option>
          </select>
        </RowItem>
        <ColorItem
          label="Tô màu"
          color={style.color || '#FFFFFF'}
          onChange={(color) => handleUpdate({ color })}
        />
        <ColorItem
          label="Viền"
          color={style.borderColor || '#CCCCCC'}
          onChange={(borderColor) => handleUpdate({ borderColor })}
        >
          <select
            value={style.borderWidth}
            onChange={(e) => handleUpdate({ borderWidth: Number(e.target.value) })}
            className={`p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
         >
            <option value={0}>Không</option>
            <option value={2}>Mỏng</option>
            <option value={4}>Dày</option>
          </select>
          <select
            value={style.borderStyle}
            onChange={(e) => handleUpdate({ borderStyle: e.target.value as NodeData['borderStyle'] })}
            className={`p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          >
            <option value="solid">Liền</option>
            <option value="dashed">Đứt</option>
            <option value="dotted">Chấm</option>
          </select>
        </ColorItem>
        {/* SỬA: Độ dài */}
        <RowItem label="Độ dài">
          <div className="flex items-center gap-1 w-full">
            <input
              type="text"
              value={localLength === 'fit' ? '' : String(localLength)} // Sửa: Chuyển sang String
              placeholder="Fit"
              onKeyDown={(e) => {
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
                const val = e.target.value.replace(/[^0-9]/g, '');
                setLocalLength(val === '' ? 'fit' : Number(val));
              }}
              className={`w-full flex-1 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
            />
            <button
              onClick={() => {
                setLocalLength('fit');
                handleUpdate({ nodeLength: 'fit' });
              }}
              className={`p-1.5 rounded text-sm ${style.nodeLength === 'fit' ? BUTTON_ACTIVE_BG : BUTTON_BG}`}
            >
              Fit
            </button>
          </div>
        </RowItem>
      </CollapsiblePanel>
      
      {/* 3. Văn bản */}
      <CollapsiblePanel label="Văn bản" defaultOpen>
        <ColorItem
          label="Màu chữ"
          color={style.textColor || '#333333'}
          onChange={(textColor) => handleUpdate({ textColor })}
        />
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
        <RowItem label="Kích thước">
          <input
            type="number"
            min={8}
            max={72}
            value={style.fontSize}
            onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
            className={`w-full flex-1 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          />
        </RowItem>
        <div className="grid grid-cols-4 gap-1">
          <TextFormatButton
            icon={<Bold size={16} />}
            isActive={style.fontWeight === 'bold'}
            onClick={() => handleUpdate({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
          />
          <TextFormatButton
            icon={<Italic size={16} />}
            isActive={style.fontStyle === 'italic'}
            onClick={() => handleUpdate({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
          />
          <TextFormatButton
            icon={<Underline size={16} />}
            isActive={style.textDecoration === 'underline'}
            onClick={() => handleUpdate({ textDecoration: style.textDecoration === 'underline' ? 'none' : 'underline' })}
          />
          <TextFormatButton
            icon={<Strikethrough size={16} />}
            isActive={style.textDecoration === 'line-through'}
            onClick={() => handleUpdate({ textDecoration: style.textDecoration === 'line-through' ? 'none' : 'line-through' })}
          />
        </div>
        <div className="grid grid-cols-4 gap-1">
          <TextFormatButton
            icon={<AlignLeft size={16} />}
            isActive={style.textAlign === 'left'}
            onClick={() => handleUpdate({ textAlign: 'left' })}
          />
          <TextFormatButton
            icon={<AlignCenter size={16} />}
            isActive={style.textAlign === 'center'}
            onClick={() => handleUpdate({ textAlign: 'center' })}
          />
          <TextFormatButton
            icon={<AlignRight size={16} />}
            isActive={style.textAlign === 'right'}
            onClick={() => handleUpdate({ textAlign: 'right' })}
          />
          <TextFormatButton
            icon={<CaseSensitive size={16} />}
            isActive={style.textCase !== 'normal'}
            onClick={() => {
              const nextCase = style.textCase === 'normal' ? 'uppercase' : (style.textCase === 'uppercase' ? 'lowercase' : 'normal');
              handleUpdate({ textCase: nextCase as NodeData['textCase'] });
            }}
          />
        </div>
     </CollapsiblePanel>

      

      {/* 5. Nhánh (con) */}
      <CollapsiblePanel label="Kiểu nhánh" defaultOpen>
        <ColorItem
          label="Màu nhánh"
          color={style.branchColor || '#666666'}
          onChange={(branchColor) => handleUpdate({ branchColor })}
        >
          <select
            value={style.branchLineStyle}
            onChange={(e) => handleUpdate({ branchLineStyle: e.target.value as NodeData['branchLineStyle'] })}
            className={`p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          >
            <option value="bezier">Cong</option>
            <option value="sharp">Gấp</option>
          </select>
          <select
            value={style.branchLineEnd}
            onChange={(e) => handleUpdate({ branchLineEnd: e.target.value as NodeData['branchLineEnd'] })}
            className={`p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          >
            <option value="none">Không</option>
            <option value="arrow">Mũi tên</option>
          </select>
        </ColorItem>
        <RowItem label="Độ dày">
          <select
            value={style.branchLineThickness}
            onChange={(e) => handleUpdate({ branchLineThickness: e.target.value as NodeData['branchLineThickness'] })}
            className={`flex-1 p-1.5 ${INPUT_BG} rounded text-sm outline-none border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          >
            <option value="thin">Mỏng</option>
            <option value="normal">Vừa</option>
            <option value="thick">Dày</option>
         </select>
        </RowItem>
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

// Nút Tab
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
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium outline-none
        ${isActive ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {label}
    </button>
  );
}

// Nút chọn cấu trúc
type StructureButtonProps = {
  label: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
};
function StructureButton({ label, isActive, onClick }: StructureButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-2 p-2 rounded-md border-2
        ${isActive ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}
section      `}
    >
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Wrapper hàng
function RowItem({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm font-medium text-gray-500 whitespace-nowrap">{label}</label>
       {children}
    </div>
  );
}


// Mục chọn màu
type ColorItemProps = {
  label: string;
  color: string;
  onChange: (color: string) => void;
  children?: React.ReactNode;
};
function ColorItem({ label, color, onChange, children }: ColorItemProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    <div className="flex items-center justify-between relative">
      <label className="text-sm font-medium text-gray-500">{label}</label>
      <div className="flex items-center gap-2">
        {children}
        <button
          className="w-8 h-6 rounded border border-gray-400"
          style={{ backgroundColor: color }}
          onClick={() => setShowPicker(!showPicker)}
        />
      </div>
      {showPicker && (
        <div ref={pickerRef} className="absolute right-0 top-full mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-300 p-2 z-10">
          <div className="grid grid-cols-6 gap-1">
            {simpleColors.map(c => (
              <button
                key={c}
                className="w-6 h-6 rounded-sm border border-gray-200"
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

// Nút Kiểu Nhanh
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

// Nút Format Text
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

// Select Đa năng
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

  // Đóng khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  return (
    <div className="relative w-36" ref={ref}>
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
        <div className="absolute z-10 top-full mt-1 w-full max-h-48 overflow-y-auto bg-white shadow-lg rounded-md border border-gray-300">
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

// Khung có thể thu gọn
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
      {isOpen && (
        <div className="pt-2 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}