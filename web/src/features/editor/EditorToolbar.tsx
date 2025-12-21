import React, { useState } from 'react';
import {
  Share2, Undo, Redo, Save, PanelRight, ZoomIn, ZoomOut, ChevronDown,
  AlignHorizontalJustifyCenter,
  AlignStartVertical,
  BoxSelect,
  Spline,
  BracesIcon,
  Presentation,
  TextSelect,
  PlusSquare, //  icon chuông
  MessageSquare, // Icon cho Chat
} from 'lucide-react';
import UserAvatarMenu from '../auth/UserAvatarMenu';
import { useEditorStore, NodeData } from '../../app/store/useEditorStore'; 
import { useMindmapsStore } from '../../app/store/useMindmapsStore';
import ExportButton from './ExportButton';

// New components
import InsertDropdown from './InsertDropdown';
import HyperlinkModal from './modals/HyperlinkModal';
import ImageModal from './modals/ImageModal';
import { useChatStore } from '../../app/store/useChatStore';

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
  presentationMode: boolean;
  onSetPresentationMode: (mode: boolean) => void;
  currentScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (scale: number) => void;
  onFitToScreen: () => void;
  selectedNodeIds: string[];
  onAddChild: () => void;
  onAddSibling: () => void;
  onSetHyperlink?: () => void;
  onToggleBoundary: () => void;
  onAddRelationship: () => void;
  onAddSummary: () => void;
  onUpdateNode: (updates: Partial<NodeData>) => void;
  onRemoveImage?: () => void;
  stageRef?: any;

  // [MỚI - Từ nhánh release/chat]
  readOnly?: boolean;
  pendingRequestsCount?: number;
  onShowRequests?: () => void;
  isOwner?: boolean;
};

type ToolbarButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  disabled,
  title,
  children,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md text-gray-700 ${className} ${
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'
    }`}
    title={title}
  >
    {children}
  </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onCommitName,
  onDashboard, onUndo, onRedo, onShare, onTheme, onSave, isDirty, onToggleFormattingToolbar,
  presentationMode, onSetPresentationMode,
  currentScale, onZoomIn, onZoomOut, onSetZoom, onFitToScreen,
  selectedNodeIds,
  onAddChild,
  onAddSibling,
  onSetHyperlink,
  onToggleBoundary,
  onAddRelationship,
  onAddSummary,
  onUpdateNode,
  onRemoveImage,
  stageRef,
  // Props mới
  readOnly = false,
  pendingRequestsCount = 0,
  onShowRequests,
  isOwner = false,
}) => {
  
  const setMindmapsItems = useMindmapsStore(s => s.set);
  const mindmapItems = useMindmapsStore(s => s.items);

  const name = useEditorStore(s => s.currentMindmapName);
  const currentMindmapId = useEditorStore(s => s.currentMindmapId); 
  const { nodes } = useEditorStore();

  // --- MERGED STATE START ---
  // State cho Modals (HEAD)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Hooks cho Chat (ft/chat)
  const { toggleChat, unreadCount, isOpen } = useChatStore();
  // --- MERGED STATE END ---

  const setName = (newName: string) => useEditorStore.setState({ 
    currentMindmapName: newName, 
    isDirty: true,
    hasManuallyRenamedMindmap: true
  });

  const safeName = name ?? '';

  const handleCommitName = () => {
    if (readOnly) return;
    onCommitName();
    if (currentMindmapId) {
      const newItems = mindmapItems.map(item => 
        item.id === currentMindmapId ? { ...item, name: safeName } : item
      );
      setMindmapsItems({ items: newItems });
    }
  };

  // Zoom logic
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
    if (value === 'fit') {
      onFitToScreen();
    } else if (value === 'custom') {
      // no-op
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

  const handleConfirmImage = (url: string | undefined) => {
    onUpdateNode({ imageUrl: url });
  };

  const handleRemoveImage = () => {
    if (!selectedNode?.imageUrl) return;
    onRemoveImage ? onRemoveImage() : onUpdateNode({ imageUrl: undefined, imageHeight: undefined, imageWidth: undefined });
  };

  // Presentation mode effect
  React.useEffect(() => {
    if (presentationMode) {
      document.body.classList.add('presentation-mode');
    } else {
      document.body.classList.remove('presentation-mode');
    }
    return () => document.body.classList.remove('presentation-mode');
  }, [presentationMode]);

  return (
    <>
    {!presentationMode && (
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-gray-200 flex items-center px-4 z-40" style={{ fontFamily: 'Arial' }}>

        {/* 1. PHẦN TRÁI: Logo + Tên Mindmap */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '300px' }}>
          <a href="/dashboard" title="Về Dashboard" className="flex items-center justify-center rounded-lg hover:bg-gray-300/60 transition-colors ml-9">
            <img src="/icons/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
          </a>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <input
            value={safeName}
            onChange={(e) => setName(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            onBlur={handleCommitName}
            disabled={readOnly}
            className={`px-3 py-1.5 rounded-md bg-transparent text-black outline-none transition-all w-64 ${
              readOnly
                ? 'opacity-70 cursor-not-allowed'
                : 'ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-aurora-500'
            }`}
            placeholder={readOnly ? 'Mindmap (chỉ xem)' : 'Đặt tên mindmap…'}
            title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Nhấn Enter để lưu tên'}
          />
        </div>

        {/* 2. PHẦN GIỮA: Các nút thao tác (ẨN HOÀN TOÀN khi readOnly) */}
        {!readOnly && (
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
            
            {/* <ToolbarButton
              onClick={onAddRelationship}
              disabled={!isSingleNodeFocused}
              title="Tạo mối quan hệ (Relationship)"
            >
              <Spline size={20} />
            </ToolbarButton> */}
            
            {/* <ToolbarButton
              onClick={onAddSummary}
              disabled={!isSingleNodeFocused}
              title="Tạo tóm tắt (Summary)"
            >
              <BracesIcon size={20} />
            </ToolbarButton> */}
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            <InsertDropdown 
              disabled={!isSingleNodeFocused}
              onInsertLink={() => setIsLinkModalOpen(true)}
              onInsertImage={() => setIsImageModalOpen(true)}
              onRemoveImage={selectedNode?.imageUrl ? handleRemoveImage : undefined}
              hasImage={!!selectedNode?.imageUrl}
            />

            {/* AI Button Placeholder */}
            {/* <div className="w-px h-6 bg-gray-300 mx-2" />
            <button onClick={() => setShowAiModal(true)} ... >Magic AI</button> */}
          </div>
        )}

        {readOnly && <div className="flex-grow" />}

        {/* 3. PHẦN PHẢI: Zoom, Undo, Save, Chuông, Share... */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Undo/Redo - Luôn hiển thị */}
          <button 
            onClick={onUndo} 
            disabled={readOnly}
            className={`p-2 rounded-md ${readOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'} text-gray-700`} 
            title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Hoàn tác (Ctrl+Z)'}
          >
            <Undo size={20} />
          </button>
          <button 
            onClick={onRedo} 
            disabled={readOnly}
            className={`p-2 rounded-md ${readOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'} text-gray-700`} 
            title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Làm lại (Ctrl+Y)'}
          >
            <Redo size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Zoom Controls */}
          <button onClick={onZoomOut} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Thu nhỏ (Ctrl + Scroll)">
            <ZoomOut size={20} />
          </button>
          <div className="relative">
            <select
              value={zoomLevels.includes(currentZoomPercent) ? currentZoomPercent : "custom"}
              onChange={handleZoomSelect}
              className="appearance-none w-20 text-center px-4 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-aurora-500 transition-all text-sm font-medium"
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

          {/* Save Button */}
          <button 
            onClick={onSave}
            disabled={!isDirty || readOnly}
            className={`p-2 rounded-md transition-all ${
              !isDirty || readOnly
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-gray-300/50 text-gray-700'
            }`}
            title={
                readOnly
                  ? 'Bạn đang ở chế độ chỉ xem'
                  : isDirty
                  ? 'Lưu thay đổi (Ctrl+S)'
                  : 'Đã lưu'
              }
          >
            <Save size={20} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            type="button"
            onClick={toggleChat}
            className={`relative p-2 rounded-md transition-colors ${
              isOpen
                ? 'bg-gray-200 text-blue-600'
                : 'text-gray-700 hover:bg-gray-300/50'
            }`}
            title="Chat thảo luận"
          >
            <MessageSquare size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={onShare} 
            className={`relative p-2 rounded-md transition-colors ${
               // Nếu có request thì highlight nhẹ
               pendingRequestsCount > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-300/50 text-gray-700'
            }`} 
            title="Chia sẻ & Quản lý quyền"
          >
            <Share2 size={20} />
            
            {/* LOGIC CHẤM ĐỎ: Nếu là Owner và có request pending */}
            {isOwner && pendingRequestsCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />

          <ExportButton 
            nodes={useEditorStore.getState().nodes}
            edges={useEditorStore.getState().edges}
            stageRef={stageRef}
            mindmapName={name || 'mindmap'}
            backgroundColor={useEditorStore.getState().backgroundColor} // ⭐ TRUYỀN BACKGROUND
          />
          
          <button
            onClick={() => onSetPresentationMode(true)}
            className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
            title="Trình chiếu"
          >
            <Presentation size={20} />
          </button>

          {/* Formatting Toolbar Toggle - Ẩn khi readOnly */}
          {!readOnly && (
            <button onClick={onToggleFormattingToolbar} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Bật/tắt thanh định dạng">
              <PanelRight size={20} />
            </button>
          )}

          <div className="w-px h-6 bg-gray-300 mx-2" />
          <UserAvatarMenu />
        </div>
      </div>
    )}

    {presentationMode && (
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-100 text-gray-500 backdrop-blur-xl shadow-elevation-strong pointer-events-auto flex items-center gap-3">
          <span className="text-sm font-semibold">Chế độ thuyết trình</span>
          <button
            onClick={() => onSetPresentationMode(false)}
            className="px-3 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-gray-600 text-sm"
          >
            Thoát
          </button>
        </div>
      </div>
    )}

    {showAiModal && (
      <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-elevation-strong p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.08em] text-ink-400">Magic AI</p>
              <h3 className="text-xl font-semibold text-ink-800">Tạo ý tưởng từ AI</h3>
            </div>
            <button onClick={() => setShowAiModal(false)} className="text-ink-400 hover:text-ink-600">✕</button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full h-28 p-3 rounded-xl border border-ink-100 bg-mist-50 outline-none focus:border-aurora-400 focus:ring-2 focus:ring-aurora-200 text-ink-800"
            placeholder="Nhập ý tưởng hoặc từ khóa để AI phát triển mindmap..."
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-ink-400">Placeholder cho API AI (sẵn sàng đấu nối).</div>
            <div className="flex gap-2">
              <button onClick={() => setShowAiModal(false)} className="px-3 py-2 rounded-xl bg-ink-50 text-ink-600 hover:bg-ink-100">Đóng</button>
              <button className="px-3 py-2 rounded-xl bg-gradient-to-r from-aurora-500 to-blush-500 text-white shadow-elevation-soft hover:shadow-elevation-strong">Gửi prompt</button>
            </div>
          </div>
        </div>
      </div>
    )}

    <HyperlinkModal 
      isOpen={isLinkModalOpen}
      onClose={() => setIsLinkModalOpen(false)}
      currentUrl={selectedNode?.hyperlink}
      onConfirm={handleConfirmLink}
    />
    
    <ImageModal
      isOpen={isImageModalOpen}
      onClose={() => setIsImageModalOpen(false)}
      currentImageUrl={selectedNode?.imageUrl}
      onConfirm={handleConfirmImage}
    />
    </>
  );
};

export default EditorToolbar;
