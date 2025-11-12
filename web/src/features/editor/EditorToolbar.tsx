import React from 'react'; 
import { Sun, Moon, Share2, Undo, Redo, Save, PanelRight, ZoomIn, ZoomOut, ChevronDown } from 'lucide-react'; 
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
};

export default function EditorToolbar({
  name, onNameChange, onCommitName,
  onDashboard, onUndo, onRedo, onShare, onTheme, onSave, onToggleFormattingToolbar,
  currentScale,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFitToScreen
}: EditorToolbarProps) {
  const isDark = document.documentElement.classList.contains("dark");

  const zoomLevels: number[] = [];
  for (let i = 50; i <= 400; i += 50) {
    zoomLevels.push(i);
  }
  if (!zoomLevels.includes(100)) {
    zoomLevels.push(100);
    zoomLevels.sort((a,b) => a - b); 
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

  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-gray-200 flex items-center px-4 pl-16 gap-2 z-40">

      {/* Logo trỏ về dashboard */}
      <a href="/dashboard" title="Về Dashboard" className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-300/60 transition-colors">
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

      <div className="flex-grow" />

      <div className="flex items-center gap-2">
        <button onClick={onUndo} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Hoàn tác (Ctrl+Z)"><Undo size={20} /></button>
        <button onClick={onRedo} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Làm lại (Ctrl+Y)"><Redo size={20} /></button>
        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button onClick={onZoomOut} className="p-2 rounded-md hover:bg-gray-100/50 text-gray-700" title="Thu nhỏ (Ctrl + Scroll)">
          <ZoomOut size={20} />
        </button>
        <div className="relative">
          <select
            // Kiểm tra xem zoom hiện tại có trong danh sách không, nếu không thì hiển thị "custom"
            value={zoomLevels.includes(currentZoomPercent) ? currentZoomPercent : "custom"}
            onChange={handleZoomSelect}
            className="appearance-none w-20 text-center px-4 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-100/50 focus:bg-white focus:ring-blue-500 transition-all text-sm font-medium"
          >
            <option value="fit">Fit </option>
            {zoomLevels.map(level => (
              <option key={level} value={level}>{level}%</option>
            ))}
            {/* Nếu zoom hiện tại không có trong danh sách (ví dụ 92%), thì hiển thị nó như một option "custom" */}
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