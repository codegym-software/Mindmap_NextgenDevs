// src/components/editor/EditorToolbar.tsx
import { Sun, Moon, Share2, Undo, Redo, LogOut, Download } from 'lucide-react';

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
  onSavePdf: () => void;
};

export default function EditorToolbar({
  name, onNameChange, onCommitName,
  onDashboard, onUndo, onRedo, onShare, onTheme, onSave, onSavePdf
}: EditorToolbarProps) {

  // Check current theme for icon display
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center px-4 gap-2 z-40">
      {/* Sidebar is now managed separately, so we don't need a margin here */}
      
      {/* Back to Dashboard Button */}
      <button
        onClick={onDashboard}
        className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors flex items-center gap-2"
        title="Quay về Dashboard"
      >
        <LogOut size={16} />
        Dashboard
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Mindmap Name (Editable) */}
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={onCommitName}
        className="px-3 py-1.5 rounded-md bg-transparent text-white outline-none ring-1 ring-transparent hover:bg-gray-800 focus:bg-gray-800 focus:ring-blue-500 w-64 transition-all"
        placeholder="Đặt tên mindmap…"
      />

      <div className="flex-grow" /> {/* Spacer */}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button onClick={onUndo} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Undo (Ctrl+Z)">
          <Undo size={20} />
        </button>
        <button onClick={onRedo} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Redo (Ctrl+Y)">
          <Redo size={20} />
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1" />

        <button onClick={onShare} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Share">
          <Share2 size={20} />
        </button>
        
        {/* CORRECTED: Theme toggle button */}
        <button onClick={onTheme} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Chuyển theme">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1" />
        
        {/* Save Buttons */}
        <button
          onClick={onSave}
          className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2"
        >
          <Download size={16} />
          Save PNG
        </button>
        <button
          onClick={onSavePdf}
          className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all flex items-center gap-2"
        >
           <Download size={16} />
          Save PDF
        </button>
      </div>
    </div>
  );
}