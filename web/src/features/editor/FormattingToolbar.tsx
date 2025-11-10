import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import {
  useEditorStore, NodeData, GlobalStructure, QuickStyleId,
  ColorTheme,
  colorThemes,
  fonts,
  getNodeComputedStyle,
  applyNodeDefaults, // Sửa: Import hàm helper
} from '../../app/store/useEditorStore'; 

// =================================================================================
// Props
// =================================================================================
type FormattingToolbarProps = {
  selectedId: string | null;
  currentNode: NodeData | null;
  currentBackgroundColor: string;
  globalStructure: GlobalStructure;
  activeColorThemeId: keyof typeof colorThemes;

  onApplyLayout: (structure: GlobalStructure) => void;
  onSetBackgroundColor: (color: string) => void;
  onSetGlobalFont: (font: string) => void;
  onSetBranchLineWidth: (width: number) => void;
  onToggleColoredBranch: (state: boolean) => void;
  onSetActiveColorTheme: (themeName: keyof typeof colorThemes) => void;

  onUpdateNode: (id: string, updates: Partial<NodeData>) => void;
  onApplyQuickStyle: (styleId: QuickStyleId) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onResetStyle: () => void;
};

// =================================================================================
// Main Component
// =================================================================================
export default function FormattingToolbar({
  selectedId,
  currentNode,
  currentBackgroundColor,
  globalStructure,
  activeColorThemeId,
  onApplyLayout,
  onSetBackgroundColor,
  onSetGlobalFont,
  onSetBranchLineWidth,
  onToggleColoredBranch,
  onSetActiveColorTheme,
  onUpdateNode,
  onApplyQuickStyle,
  onCopyStyle,
  onPasteStyle,
  onResetStyle,
}: FormattingToolbarProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'map'>('style');
  const activeTheme = colorThemes[activeColorThemeId];
  const isDisabled = !selectedId; // Tab Style bị vô hiệu hóa nếu không chọn node

  return (
    // SỬA: Chuyển sang theme sáng
    <div className="absolute top-14 right-0 h-[calc(100vh-3.5rem)] w-72 bg-white border-l border-gray-200 shadow-sm z-30 flex flex-col text-gray-700">
      {/* 1. Header (Tabs) */}
      <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} isDisabled={isDisabled} />

      {/* 2. Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'style' && (
          <NodeStylePanel
            selectedId={selectedId}
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
    // SỬA: Màu sáng
    <div className="flex justify-center border-b border-gray-200 bg-gray-50">
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
}: MapPanelProps) {
  const currentFont = useEditorStore((s) => s.globalFont);
  const currentLineWidth = useEditorStore((s) => s.branchLineWidth);
  const isColored = useEditorStore((s) => s.isColoredBranch);
  const activeTheme = colorThemes[activeColorThemeId];

  return (
    // SỬA: Bỏ CollapsibleSection, dùng p-4
    <div className="p-4 space-y-4">
      {/* 1. Cấu trúc */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-500">Cấu trúc</label>
        <div className="flex justify-between gap-2">
          {/* SỬA: Bỏ biểu tượng */}
          <StructureButton
            label="Mindmap"
            isActive={globalStructure === 'mindmap'}
            onClick={() => onApplyLayout('mindmap')}
          />
          <StructureButton
            label="Logic"
            isActive={globalStructure === 'logic'}
            onClick={() => onApplyLayout('logic')}
          />
          <StructureButton
            label="Org"
            isActive={globalStructure === 'org'}
            onClick={() => onApplyLayout('org')}
          />
        </div>
      </div>

      {/* 2. Chủ đề màu */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-500">Chủ đề màu</label>
        <CustomSelect
          value={activeColorThemeId}
          onChange={(val) => onSetActiveColorTheme(val as keyof typeof colorThemes)}
        >
          {Object.entries(colorThemes).map(([id, theme]) => (
            <Option key={id} value={id}>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {theme.variations.slice(0, 4).map((v, i) => (
                    <div key={i} className="w-3 h-5" style={{ backgroundColor: v.fill }} />
                  ))}
                </div>
                <span>{theme.name}</span>
              </div>
            </Option>
          ))}
        </CustomSelect>
      </div>
      {/* 6 ô biến thể */}
      <div className="grid grid-cols-6 gap-2 pt-1">
        {activeTheme.variations.map((v, i) => (
          <button
            key={i}
            className="h-6 rounded border border-gray-300/50 transition-transform active:scale-95"
            style={{ backgroundColor: v.fill }}
            title={`Variation ${i + 1}`}
          />
        ))}
      </div>


      {/* 3. Màu nền */}
      <ColorItem
        label="Màu nền"
        color={currentBackgroundColor}
        onChange={onSetBackgroundColor}
      />

      {/* 4. Phông chữ toàn cục */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-500">Phông chữ</label>
        <CustomSelect
          value={currentFont}
          onChange={onSetGlobalFont}
        >
          {fonts.map((font) => (
            <Option key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </Option>
          ))}
        </CustomSelect>
      </div>
      
      {/* 5. Độ dày nhánh */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-500">Độ dày nhánh</label>
        <select
          value={currentLineWidth}
          onChange={(e) => onSetBranchLineWidth(Number(e.target.value))}
          className="bg-gray-100 border border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value={1}>Mỏng</option>
          <option value={2}>Vừa</option>
          <option value={4}>Dày</option>
        </select>
      </div>

      {/* 6. Nhánh nhiều màu */}
      <ColorItem
        label="Nhánh nhiều màu"
        color={isColored ? '#3b82f6' : '#E5E7EB'} // Dùng màu xanh
        onChange={() => onToggleColoredBranch(!isColored)} // Bật/tắt
      />
    </div>
  );
}

// =================================================================================
// Tab "Style" (Cài đặt Node)
// =================================================================================
type NodeStylePanelProps = {
  selectedId: string | null;
  currentNode: NodeData | null;
  activeTheme: ColorTheme;
  onUpdateNode: (id: string, updates: Partial<NodeData>) => void;
  onApplyQuickStyle: (styleId: QuickStyleId) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onResetStyle: () => void;
};
function NodeStylePanel({
  selectedId,
  currentNode,
  activeTheme,
  onUpdateNode,
  onApplyQuickStyle,
  onCopyStyle,
  onPasteStyle,
  onResetStyle,
}: NodeStylePanelProps) {
  
  // Tính toán style
  const style = useMemo(() => {
    return getNodeComputedStyle(currentNode, activeTheme, useEditorStore.getState().globalFont);
  }, [currentNode, activeTheme]);
  
  // SỬA: State cục bộ cho "Độ dài"
  const [localLength, setLocalLength] = useState(style.nodeLength);
  useEffect(() => {
    setLocalLength(style.nodeLength);
  }, [style.nodeLength]);


  // Handler chung
  const handleUpdate = (updates: Partial<NodeData>) => {
    if (selectedId) {
      onUpdateNode(selectedId, updates);
    }
  };

  return (
    <div className="p-4 space-y-1">
      {/* 1. Kiểu nhanh */}
      {selectedId !== 'root' && (
        <CollapsibleSection title="Kiểu nhanh">
          <div className="grid grid-cols-2 gap-2">
            <QuickStyleButton
              label="Rất quan trọng"
              styleId="important"
              activeTheme={activeTheme}
              onClick={() => onApplyQuickStyle('important')}
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
        </CollapsibleSection>
      )}

      {/* 2. Hình dạng */}
      <CollapsibleSection title="Hình dạng">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-500">Hình dạng</label>
          <select
            value={style.shape}
            onChange={(e) => handleUpdate({ shape: e.target.value as NodeData['shape'] })}
            className="bg-gray-100 border border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="roundedRect">Bo góc</option>
            <option value="rectangle">Vuông</option>
            <option value="circle">Tròn</option>
            <option value="diamond">Thoi</option>
          </select>
        </div>
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
          {/* Sub-options cho Viền */}
          <select
            value={style.borderWidth}
            onChange={(e) => handleUpdate({ borderWidth: Number(e.target.value) })}
            className="bg-gray-100 border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={0}>Không</option>
            <option value={2}>Mỏng</option>
            <option value={4}>Dày</option>
          </select>
          <select
            value={style.borderStyle}
            onChange={(e) => handleUpdate({ borderStyle: e.target.value as NodeData['borderStyle'] })}
            className="bg-gray-100 border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="solid">Liền</option>
            <option value="dashed">Đứt</option>
            <option value="dotted">Chấm</option>
          </select>
        </ColorItem>
        {/* SỬA: Độ dài */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-500">Độ dài</label>
          <div className="flex items-center gap-1">
            <input
              type="text" // Đổi sang text
              value={localLength === 'fit' ? '' : localLength}
              placeholder="Fit"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={(e) => {
                let val: number | 'fit' = parseInt(e.target.value);
                if (isNaN(val) || e.target.value === '') {
                  val = 'fit';
                } else if (val < 80) {
                  val = 80;
                }
                setLocalLength(val); // Cập nhật state cục bộ
                handleUpdate({ nodeLength: val }); // Gửi lên store
              }}
              onChange={(e) => {
                // Chỉ cho phép nhập số
                const val = e.target.value.replace(/[^0-9]/g, '');
                setLocalLength(val === '' ? 'fit' : Number(val));
              }}
              className="w-16 bg-gray-100 border border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                setLocalLength('fit');
                handleUpdate({ nodeLength: 'fit' });
              }}
              className={`p-1 rounded ${style.nodeLength === 'fit' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Fit
            </button>
          </div>
        </div>
      </CollapsibleSection>
      
      {/* 3. Văn bản */}
      <CollapsibleSection title="Văn bản">
        {/* SỬA: Thêm Màu chữ */}
        <ColorItem
          label="Màu chữ"
          color={style.textColor || '#333333'}
          onChange={(textColor) => handleUpdate({ textColor })}
        />
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-500">Phông chữ</label>
          <CustomSelect
            value={style.fontFamily}
            onChange={(fontFamily) => handleUpdate({ fontFamily })}
          >
            {fonts.map((font) => (
              <Option key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </Option>
            ))}
          </CustomSelect>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-500">Kích thước</label>
          <input
            type="number"
            min={8}
            max={72}
            value={style.fontSize}
            onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
            className="w-16 bg-gray-100 border border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
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
        {/* SỬA: Căn lề và Case */}
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
      </CollapsibleSection>

      {/* 4. Cấu trúc (con) */}
      <CollapsibleSection title="Cấu trúc nhánh con">
        <div className="flex justify-between gap-2">
          <StructureButton
            label="Logic"
            isActive={style.localStructure === 'logic'}
            onClick={() => handleUpdate({ localStructure: 'logic' })}
          />
          <StructureButton
            label="Org"
            isActive={style.localStructure === 'org'}
            onClick={() => handleUpdate({ localStructure: 'org' })}
          />
        </div>
      </CollapsibleSection>
      
      {/* 5. Nhánh (con) */}
      <CollapsibleSection title="Kiểu nhánh con">
        <ColorItem
          label="Màu nhánh"
          color={style.branchColor || '#666666'}
          onChange={(branchColor) => handleUpdate({ branchColor })}
        >
          <select
            value={style.branchLineStyle}
            onChange={(e) => handleUpdate({ branchLineStyle: e.target.value as NodeData['branchLineStyle'] })}
            className="bg-gray-100 border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="bezier">Cong</option>
            <option value="sharp">Gấp</option>
          </select>
          <select
            value={style.branchLineEnd}
            onChange={(e) => handleUpdate({ branchLineEnd: e.target.value as NodeData['branchLineEnd'] })}
            className="bg-gray-100 border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="none">Không</option>
            <option value="arrow">Mũi tên</option>
          </select>
        </ColorItem>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-500">Độ dày nhánh con</label>
          <select
            value={style.branchLineThickness}
            onChange={(e) => handleUpdate({ branchLineThickness: e.target.value as NodeData['branchLineThickness'] })}
            className="bg-gray-100 border border-gray-300 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="thin">Mỏng</option>
            <option value="normal">Vừa</option>
            <option value="thick">Dày</option>
          </select>
        </div>
      </CollapsibleSection>
      
      {/* 6. Thao tác nhanh */}
      <CollapsibleSection title="Thao tác">
        <div className="grid grid-cols-3 gap-1">
          <TextFormatButton icon={<Copy size={16} />} onClick={onCopyStyle} />
          <TextFormatButton icon={<ClipboardPaste size={16} />} onClick={onPasteStyle} />
          <TextFormatButton icon={<RotateCcw size={16} />} onClick={onResetStyle} />
        </div>
      </CollapsibleSection>
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
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium outline-none
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
  label: string;
  isActive: boolean;
  onClick: () => void;
};
function StructureButton({ label, isActive, onClick }: StructureButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-2 p-2 rounded-md border-2
        ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}
      `}
    >
      <span className="text-xs font-medium">{label}</span>
    </button>
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
  // Logic hiển thị Color Picker (đơn giản hóa)
  const [showPicker, setShowPicker] = useState(false);
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
        {/* Render các children (ví dụ: select độ dày) */}
        {children}
        <button
          className="w-8 h-6 rounded border border-gray-400" // SỬA: Hình chữ nhật
          style={{ backgroundColor: color }}
          onClick={() => setShowPicker(!showPicker)}
        />
      </div>
      {/* Bảng màu Popover */}
      {showPicker && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-300 p-2 z-10">
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
      className="p-2 rounded-md border text-center transition-all hover:shadow-md"
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
      className={`p-2 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
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
  
  const selectedChild = React.Children.toArray(children).find(
    (child) => (child as React.ReactElement).props.value === value
  ) as React.ReactElement;

  return (
    <div className="relative w-36"> {/* SỬA: Thêm w-36 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 border border-gray-300 rounded p-2 text-sm text-left flex items-center justify-between"
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
  onClick?: () => void; // Sẽ được inject bởi CustomSelect
  isActive?: boolean; // Sẽ được inject bởi CustomSelect
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
type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
};
function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(true); // Mặc định mở
  return (
    // SỬA: Màu sáng
    <div className="border-b border-gray-200 pb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded"
      >
        {title}
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

