import { Sun, Moon, Share2, Undo, Redo, Save, PanelRight } from 'lucide-react';
import UserAvatarMenu from '../auth/UserAvatarMenu'; // SỬA: Đổi lại đường dẫn import

type EditorToolbarProps = {
  name: string;
// ... (phần còn lại của file không đổi) ...
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
    <div 
      className="fixed top-0 left-0 right-0 h-14 border-b border-gray-300 flex items-center px-4 pl-16 gap-2 z-40"
      style={{ backgroundColor: '#efefefff' }}
    >
      
      <a href="/dashboard" title="Về Dashboard" className="flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-300/60 transition-colors">
        <img src="https://placehold.co/32x32/3b82f6/white?text=M" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
      </a>

      <div className="w-px h-6 bg-gray-400 mx-2" />

      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={onCommitName}
        className="px-3 py-1.5 rounded-md bg-transparent text-gray-900 outline-none ring-1 ring-transparent hover:bg-gray-300/70 focus:bg-gray-300/70 focus:ring-blue-500 w-64 transition-all placeholder-gray-600"
        placeholder="Đặt tên mindmap..."
      />

      <div className="flex-grow" />

      <div className="flex items-center gap-2 text-gray-700">
        <button onClick={onUndo} className="p-2 rounded-md hover:bg-gray-300/70" title="Hoàn tác (Ctrl+Z)"><Undo size={20} /></button>
        <button onClick={onRedo} className="p-2 rounded-md hover:bg-gray-300/70" title="Làm lại (Ctrl+Y)"><Redo size={20} /></button>
        
        <div className="w-px h-6 bg-gray-400 mx-1" />
        
        <button onClick={onSave} className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2" title="Lưu (Ctrl+S)">
          <Save size={16} /> Lưu
        </button>

        <div className="w-px h-6 bg-gray-400 mx-1" />

        <button onClick={onShare} className="p-2 rounded-md hover:bg-gray-300/70" title="Chia sẻ"><Share2 size={20} /></button>
        <button onClick={onTheme} className="p-2 rounded-md hover:bg-gray-300/70" title="Chuyển theme">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
        <button onClick={onToggleFormattingToolbar} className="p-2 rounded-md hover:bg-gray-300/70" title="Bật/tắt thanh định dạng"><PanelRight size={20} /></button>

        <div className="w-px h-6 bg-gray-400 mx-1" />
        
        <UserAvatarMenu />
      </div>
    </div>
  );
}

