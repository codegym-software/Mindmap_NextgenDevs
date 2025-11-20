import { Sun, Moon, Share2, Undo, Redo, Save, PanelRight } from 'lucide-react';
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
};

export default function EditorToolbar({
  name, onNameChange, onCommitName,
  onDashboard, onUndo, onRedo, onShare, onTheme, onSave, onToggleFormattingToolbar
}: EditorToolbarProps) {
  const isDark = document.documentElement.classList.contains("dark");

  return (
    // SỬA: Đổi màu nền
    <div className="fixed top-0 left-0 right-0 h-14 bg-[#e2e2e2] border-b border-gray-300 flex items-center px-4 pl-16 gap-2 z-40">

      {/* Sửa: Logo trỏ về dashboard */}
      <a href="/dashboard" title="Về Dashboard" className="flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-300/60 transition-colors">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
      </a>

      {/* Sửa: Màu vạch chia */}
      <div className="w-px h-6 bg-gray-400 mx-2" />

      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={onCommitName}
        // Sửa: Màu chữ và nền cho theme sáng
        className="px-3 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-blue-500 w-64 transition-all"
        placeholder="Đặt tên mindmap…"
      />

      <div className="flex-grow" />

      <div className="flex items-center gap-2">
        {/* Sửa: Màu chữ cho icon theme sáng */}
        <button onClick={onUndo} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Hoàn tác (Ctrl+Z)"><Undo size={20} /></button>
        <button onClick={onRedo} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Làm lại (Ctrl+Y)"><Redo size={20} /></button>
        <div className="w-px h-6 bg-gray-400 mx-1" />

        <button onClick={onSave} className="px-4 py-1.5 rounded-md hover:bg-gray-300/50 text-gray-700 transition-all flex items-center gap-2" title="Lưu (Ctrl+S)">
          <Save size={16} />
        </button>

        <div className="w-px h-6 bg-gray-400 mx-1" />

        <button onClick={onShare} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Chia sẻ"><Share2 size={20} /></button>
        <button onClick={onTheme} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Chuyển theme">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
        <button onClick={onToggleFormattingToolbar} className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700" title="Bật/tắt thanh định dạng"><PanelRight size={20} /></button>

        <div className="w-px h-6 bg-gray-400 mx-1" />
        
        <UserAvatarMenu />
      </div>
    </div>
  );
}