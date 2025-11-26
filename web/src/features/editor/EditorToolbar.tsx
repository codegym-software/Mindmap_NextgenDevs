import React, { useState } from 'react';
import {
  Share2, Undo, Redo, Save, PanelRight, ZoomIn, ZoomOut, ChevronDown,
  AlignHorizontalJustifyCenter, // Node con
  AlignStartVertical,  // Node anh em
  BoxSelect,  // Boundary
} from 'lucide-react';
import UserAvatarMenu from '../auth/UserAvatarMenu';
import { useEditorStore, NodeData } from '../../app/store/useEditorStore'; 
import { useMindmapsStore } from '../../app/store/useMindmapsStore';

// New components
import InsertDropdown from './InsertDropdown';
import HyperlinkModal from './modals/HyperlinkModal';
import ImageModal from './modals/ImageModal';

type EditorToolbarProps = {
  onCommitName: () => void; 
  onDashboard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => void;
  onTheme: () => void;
  onSave: () => void;
  isDirty: boolean; 
  onToggleFormattingToolbar: () => void;
  currentScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (scale: number) => void;
  onFitToScreen: () => void;
  selectedNodeIds: string[];
  onAddChild: () => void;
  onAddSibling: () => void;
  onSetHyperlink?: () => void; // Đánh dấu optional vì đã có logic mới
  onToggleBoundary: () => void;
  onUpdateNode: (updates: Partial<NodeData>) => void; // [MỚI]
};

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
  onCommitName,
  onDashboard, onUndo, onRedo, onShare, onTheme, onSave, isDirty, onToggleFormattingToolbar,
  currentScale, onZoomIn, onZoomOut, onSetZoom, onFitToScreen,
  selectedNodeIds,
  onAddChild,
  onAddSibling,
  onSetHyperlink,
  onToggleBoundary,
  onUpdateNode
}: EditorToolbarProps) {
  
  const setMindmapsItems = useMindmapsStore(s => s.set);
  const mindmapItems = useMindmapsStore(s => s.items);

  const name = useEditorStore(s => s.currentMindmapName);
  const currentMindmapId = useEditorStore(s => s.currentMindmapId); 
  const { nodes } = useEditorStore();

  // [MỚI] State cho Modals
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const setName = (newName: string) => useEditorStore.setState({ currentMindmapName: newName, isDirty: true });

  const handleCommitName = () => {
    onCommitName(); 
    if (currentMindmapId) {
        const newItems = mindmapItems.map(item => 
            item.id === currentMindmapId ? { ...item, name: name } : item
        );
        setMindmapsItems({ items: newItems });
    }
  };

  // Logic Zoom
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

  const isSingleNodeFocused = selectedNodeIds.length === 1;
  const isNotRootAndSingle = isSingleNodeFocused && selectedNodeIds[0] !== 'root';
  const selectedNode = isSingleNodeFocused ? nodes.find(n => n.id === selectedNodeIds[0]) : null;

  // Handlers Update Node
  const handleConfirmLink = (url: string | undefined) => {
    onUpdateNode({ hyperlink: url });
  };

  const handleConfirmImage = (url: string) => {
    onUpdateNode({ imageUrl: url });
  };

  return (
    <>
    <div className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-gray-200 flex items-center px-4 z-40">

      {/* 1. PHẦN BÊN TRÁI (Logo, Tên) */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '300px' }}>
        <a href="/dashboard" title="Về Dashboard" className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-300/60 transition-colors ml-9">
          <img src="/icons/logo.png" alt="Logo" className="w-7 h-7 rounded-md object-cover" />
        </a>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          onBlur={handleCommitName}
          className="px-3 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-blue-500 w-64 transition-all"
          placeholder="Đặt tên mindmap…"
        />
      </div>

      {/* 2. PHẦN GIỮA (Các nút thêm mới) */}
      <div className="flex-grow flex items-center justify-center gap-2">
        <ToolbarButton
          onClick={onAddChild}
          disabled={!isSingleNodeFocused} 
          title="Thêm Node con (Tab)"
        >
          <AlignHorizontalJustifyCenter size={20} />
        </ToolbarButton>

        <ToolbarButton
          onClick={onAddSibling}
          disabled={!isNotRootAndSingle} 
          title="Thêm Node anh em (Enter)"
        >
          <AlignStartVertical size={20} />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-gray-300 mx-2" />

        <ToolbarButton
          onClick={onToggleBoundary}
          disabled={!isSingleNodeFocused}
          title="Tạo hoặc xóa đường viền"
          className={selectedNode?.boundary ? 'bg-gray-300/80' : ''}
        >
          <BoxSelect size={20} />
        </ToolbarButton>
        
        {/* [THAY ĐỔI] Sử dụng InsertDropdown thay vì nút Hyperlink cũ */}
        <InsertDropdown 
          disabled={!isSingleNodeFocused}
          onInsertLink={() => setIsLinkModalOpen(true)}
          onInsertImage={() => setIsImageModalOpen(true)}
        />
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

        <button 
          onClick={onSave}
          disabled={!isDirty} // Ẩn (mờ) khi !isDirty, Hiện khi isDirty
          title={isDirty ? "Lưu thay đổi (Ctrl+S)" : "Chưa có gì thay đổi"}
        >
          <Save size={20} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button onClick={onShare} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Chia sẻ"><Share2 size={20} /></button>
        <button onClick={onToggleFormattingToolbar} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Bật/tắt thanh định dạng"><PanelRight size={20} /></button>

        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <UserAvatarMenu />
      </div>
    </div>

    {/* Modals */}
    <HyperlinkModal 
      isOpen={isLinkModalOpen}
      onClose={() => setIsLinkModalOpen(false)}
      currentUrl={selectedNode?.hyperlink}
      onConfirm={handleConfirmLink}
    />
    
    <ImageModal
      isOpen={isImageModalOpen}
      onClose={() => setIsImageModalOpen(false)}
      onConfirm={handleConfirmImage}
    />
    </>
  );
}