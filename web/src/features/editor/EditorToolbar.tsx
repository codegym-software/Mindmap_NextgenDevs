// src/features/editor/EditorToolbar.tsx (hoặc src/components/editor/EditorToolbar.tsx)

import React from 'react';
import {
  Share2,
  Undo,
  Redo,
  Save,
  PanelRight,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  AlignHorizontalJustifyCenter,
  AlignStartVertical,
  GitPullRequestDraft,
  BoxSelect,
  TextSelect,
  PlusSquare,
  Bell, // ✅ THÊM: icon chuông
} from 'lucide-react';
import UserAvatarMenu from '../auth/UserAvatarMenu';
import { useEditorStore } from '../../app/store/useEditorStore';
import { useMindmapsStore } from '../../app/store/useMindmapsStore';

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
  onSetHyperlink: () => void;

  // [MỚI] Cho phép hiển thị chế độ chỉ xem
  readOnly?: boolean;

  // ✅ [MỚI] props cho nút chuông thông báo
  pendingRequestsCount?: number;      // số request access đang chờ
  onShowRequests?: () => void;        // mở modal/list request
  isOwner?: boolean;                  // có phải owner mindmap không
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
  onDashboard,
  onUndo,
  onRedo,
  onShare,
  onTheme, // hiện chưa dùng nhưng giữ lại props cho tương lai
  onSave,
  isDirty,
  onToggleFormattingToolbar,
  currentScale,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFitToScreen,
  selectedNodeIds,
  onAddChild,
  onAddSibling,
  onSetHyperlink,
  readOnly = false,

  // ✅ default cho props mới
  pendingRequestsCount = 0,
  onShowRequests,
  isOwner = false,
}) => {
  const setMindmapsItems = useMindmapsStore((s) => s.set);
  const mindmapItems = useMindmapsStore((s) => s.items);

  const name = useEditorStore((s) => s.currentMindmapName);
  const currentMindmapId = useEditorStore((s) => s.currentMindmapId);

  const safeName = name ?? ''; // Tránh uncontrolled → controlled

  const setName = (newName: string) => {
    if (readOnly) return;
    useEditorStore.setState({ currentMindmapName: newName, isDirty: true });
  };

  const handleCommitName = () => {
    if (readOnly) return;

    onCommitName();

    if (currentMindmapId) {
      const newItems = mindmapItems.map((item) =>
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
      // không làm gì, chỉ hiển thị
    } else {
      onSetZoom(Number(value) / 100);
    }
  };

  const isSingleNodeFocused = selectedNodeIds.length === 1;
  const isNotRootAndSingle =
    isSingleNodeFocused && selectedNodeIds[0] !== 'root';

  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-gray-200 flex items-center px-4 z-40">
      {/* 1. PHẦN TRÁI: Logo + Tên Mindmap */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ minWidth: '300px' }}
      >
        <a
          href="/dashboard"
          title="Về Dashboard"
          className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-300/60 transition-colors ml-9"
          onClick={(e) => {
            e.preventDefault();
            onDashboard();
          }}
        >
          <img
            src="/icons/logo.png"
            alt="Logo"
            className="w-7 h-7 rounded-md object-cover"
          />
        </a>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <input
          value={safeName}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={handleCommitName}
          disabled={readOnly}
          className={`px-3 py-1.5 rounded-md bg-transparent text-black outline-none transition-all w-64 ${
            readOnly
              ? 'opacity-70 cursor-not-allowed'
              : 'ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-blue-500'
          }`}
          placeholder={readOnly ? 'Mindmap (chỉ xem)' : 'Đặt tên mindmap…'}
          title={
            readOnly
              ? 'Bạn đang ở chế độ chỉ xem'
              : 'Nhấn Enter để lưu tên'
          }
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
            onClick={() =>
              alert('Chức năng Relationship sẽ sớm ra mắt!')
            }
            disabled={!isNotRootAndSingle}
            title="Tạo liên kết (Sắp ra mắt)"
          >
            <GitPullRequestDraft size={20} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() =>
              alert('Chức năng Boundary sẽ sớm ra mắt!')
            }
            disabled={!isNotRootAndSingle}
            title="Tạo đường viền (Sắp ra mắt)"
          >
            <BoxSelect size={20} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() =>
              alert('Chức năng Summary sẽ sớm ra mắt!')
            }
            disabled={!isNotRootAndSingle}
            title="Tạo tóm tắt (Sắp ra mắt)"
          >
            <TextSelect size={20} />
          </ToolbarButton>

          <ToolbarButton
            onClick={onSetHyperlink}
            disabled={!isSingleNodeFocused}
            title="Chèn Hyperlink"
          >
            <PlusSquare size={20} />
          </ToolbarButton>
        </div>
      )}

      {/* 3. PHẦN PHẢI: Zoom, Undo, Save, Chuông, Share... */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Undo / Redo - Ẩn khi readOnly */}
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={onUndo}
              className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo size={20} />
            </button>
            <button
              type="button"
              onClick={onRedo}
              className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
              title="Làm lại (Ctrl+Y)"
            >
              <Redo size={20} />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
          </>
        )}

        {/* Zoom controls - luôn hiện */}
        <button
          type="button"
          onClick={onZoomOut}
          className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
          title="Thu nhỏ"
        >
          <ZoomOut size={20} />
        </button>

        <div className="relative">
          <select
            value={
              zoomLevels.includes(currentZoomPercent)
                ? String(currentZoomPercent)
                : 'custom'
            }
            onChange={handleZoomSelect}
            className="appearance-none w-20 text-center px-4 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-blue-500 transition-all text-sm font-medium"
          >
            <option value="fit">Vừa vặn</option>
            {zoomLevels.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
            {!zoomLevels.includes(currentZoomPercent) && (
              <option value="custom" disabled>
                {currentZoomPercent}%
              </option>
            )}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>

        <button
          type="button"
          onClick={onZoomIn}
          className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
          title="Phóng to"
        >
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Nút Save - disable + mờ khi readOnly hoặc không thay đổi */}
        <button
          type="button"
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

        {/* ✅ NÚT CHUÔNG – chỉ hiện khi là Owner */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onShowRequests && onShowRequests()}
            className={`relative p-2 rounded-md transition-colors ${
              pendingRequestsCount > 0
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'text-gray-700 hover:bg-gray-300/50'
            }`}
            title={
              pendingRequestsCount > 0
                ? `Bạn có ${pendingRequestsCount} yêu cầu truy cập đang chờ`
                : 'Yêu cầu truy cập'
            }
          >
            <Bell className="w-5 h-5" />
            {pendingRequestsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>
            )}
          </button>
        )}

        {/* Share & Formatting - luôn hiện (người xem vẫn cần chia sẻ link) */}
        <button
          type="button"
          onClick={onShare}
          className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
          title="Chia sẻ"
        >
          <Share2 size={20} />
        </button>

        {/* Ẩn thanh định dạng khi readOnly */}
        {!readOnly && (
          <button
            type="button"
            onClick={onToggleFormattingToolbar}
            className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
            title="Thanh định dạng"
          >
            <PanelRight size={20} />
          </button>
        )}

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <UserAvatarMenu />
      </div>
    </div>
  );
};

export default EditorToolbar;
