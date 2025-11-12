import React from 'react';
import {
  Share2, Undo, Redo, Save, PanelRight, ZoomIn, ZoomOut, ChevronDown,
  AlignHorizontalJustifyCenter,  // Node con
  AlignStartVertical,  // Node anh em
  GitPullRequestDraft,       // Relationship
  BoxSelect,  // Boundary
  TextSelect, // Summary
  PlusSquare  // Insert
} from 'lucide-react';
import UserAvatarMenu from '../auth/UserAvatarMenu';

type EditorToolbarProps = {
  name: string;
  onNameChange: (v: string) => void;
  onCommitName: () => void;
  onDashboard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => void;
  onTheme: () => void;
  onSave: () => void;
  onToggleFormattingToolbar: () => void;
  currentScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (scale: number) => void;
  onFitToScreen: () => void;

  // [SỬA] Thêm props mới để xử lý logic
  selectedNodeIds: string[];
  onAddChild: () => void;
  onAddSibling: () => void;
  onSetHyperlink: () => void; // Cho nút Insert
};

// [SỬA] Component Nút Bấm Tùy Chỉnh (để xử lý `disabled`)
const ToolbarButton = ({
  onClick,
  disabled,
  title,
  children,
  className = ""
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md text-gray-700 ${className} ${
      disabled 
        ? 'opacity-40 cursor-not-allowed' 
        : 'hover:bg-gray-300/50'
    }`}
    title={title}
  >
    {children}
  </button>
);


export default function EditorToolbar({
  name, onNameChange, onCommitName,
  onDashboard, onUndo, onRedo, onShare, onTheme, onSave, onToggleFormattingToolbar,
  currentScale, onZoomIn, onZoomOut, onSetZoom, onFitToScreen,
  // [SỬA] Nhận props mới
  selectedNodeIds,
  onAddChild,
  onAddSibling,
  onSetHyperlink
}: EditorToolbarProps) {

  const zoomLevels: number[] = [];
  for (let i = 50; i <= 400; i += 50) {
    zoomLevels.push(i);
  }
  if (!zoomLevels.includes(100)) {
    zoomLevels.push(100);
    zoomLevels.sort((a, b) => a - b);
  }
  const currentZoomPercent = Math.round(currentScale * 100);

  const handleZoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "fit") {
      onFitToScreen();
    } else {
      onSetZoom(Number(value) / 100);
    }
  };

  // Chỉ bật khi CHỈ MỘT node được chọn
  const isSingleNodeFocused = selectedNodeIds.length === 1;
  // Chỉ bật khi MỘT node được chọn VÀ đó KHÔNG PHẢI là root
  const isNotRootAndSingle = isSingleNodeFocused && selectedNodeIds[0] !== 'root';

  return (
    // [SỬA] Thay đổi layout để có 3 phần (Trái, Giữa, Phải)
    <div className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-gray-200 flex items-center px-4 z-40">

      {/* 1. PHẦN BÊN TRÁI (Logo, Tên) */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '300px' }}>
        <a href="/dashboard" title="Về Dashboard" className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-300/60 transition-colors ml-9">
          <img src="/icons/logo.png" alt="Logo" className="w-7 h-7 rounded-md object-cover" />
        </a>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          onBlur={onCommitName}
          className="px-3 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-blue-500 w-64 transition-all"
          placeholder="Đặt tên mindmap…"
        />
      </div>

      {/* 2. PHẦN GIỮA (Các nút thêm mới) */}
      <div className="flex-grow flex items-center justify-center gap-2">
        <ToolbarButton
          onClick={onAddChild}
          disabled={!isSingleNodeFocused} // Tắt khi chọn > 1 node
          title="Thêm Node con (Tab)"
        >
          <AlignHorizontalJustifyCenter size={20} />
        </ToolbarButton>

        <ToolbarButton
          onClick={onAddSibling}
          disabled={!isNotRootAndSingle} // Tắt khi chọn > 1 node hoặc chọn root
          title="Thêm Node anh em (Enter)"
        >
          <AlignStartVertical size={20} />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-gray-300 mx-2" />

        <ToolbarButton
          onClick={() => alert('Chức năng Relationship (Liên kết) sẽ sớm ra mắt!')}
          disabled={!isNotRootAndSingle} // Bật khi 1 node (không phải root) được chọn
          title="Tạo liên kết (Sắp ra mắt)"
        >
          <GitPullRequestDraft size={20} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => alert('Chức năng Boundary (Đường viền) sẽ sớm ra mắt!')}
          disabled={!isNotRootAndSingle} // Bật khi 1 node (không phải root) được chọn
          title="Tạo đường viền (Sắp ra mắt)"
        >
          <BoxSelect size={20} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => alert('Chức năng Summary (Tóm tắt) sẽ sớm ra mắt!')}
          disabled={!isNotRootAndSingle} // Bật khi 1 node (không phải root) được chọn
          title="Tạo tóm tắt (Sắp ra mắt)"
        >
          <TextSelect size={20} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={onSetHyperlink} // [SỬA] Kích hoạt nút Insert
          disabled={!isSingleNodeFocused} // Bật khi 1 node (kể cả root) được chọn
          title="Chèn Hyperlink"
        >
          <PlusSquare size={20} />
        </ToolbarButton>
      </div>

      {/* 3. PHẦN BÊN PHẢI (Zoom, Undo, Chia sẻ...) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onUndo} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Hoàn tác (Ctrl+Z)"><Undo size={20} /></button>
        <button onClick={onRedo} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Làm lại (Ctrl+Y)"><Redo size={20} /></button>
        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button onClick={onZoomOut} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Thu nhỏ (Ctrl + Scroll)">
          <ZoomOut size={20} />
        </button>
        <div className="relative">
          <select
            value={zoomLevels.includes(currentZoomPercent) ? currentZoomPercent : "custom"}
            onChange={handleZoomSelect}
            className="appearance-none w-20 text-center px-4 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-blue-500 transition-all text-sm font-medium"
          >
            <option value="fit">Vừa vặn</option>
            {zoomLevels.map(level => (
              <option key={level} value={level}>{level}%</option>
            ))}
            {!zoomLevels.includes(currentZoomPercent) && (
              <option value="custom" disabled>{currentZoomPercent}%</option>
            )}
          </select>
          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <button onClick={onZoomIn} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Phóng to (Ctrl + Scroll)">
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button onClick={onSave} className="px-4 py-1.5 rounded-md hover:bg-gray-300/50 text-gray-700 transition-all flex items-center gap-2" title="Lưu (Ctrl+S)">
          <Save size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button onClick={onShare} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Chia sẻ"><Share2 size={20} /></button>
        <button onClick={onToggleFormattingToolbar} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Bật/tắt thanh định dạng"><PanelRight size={20} /></button>

        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <UserAvatarMenu />
      </div>
    </div>
  );
}