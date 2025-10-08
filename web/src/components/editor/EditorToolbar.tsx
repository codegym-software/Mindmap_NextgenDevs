import { useContext } from "react";
import { ThemeContext } from "../../app/providers/ThemeProvider";
import Button from "../common/Button";

// Định nghĩa kiểu props nhận từ Editor.tsx
type EditorToolbarProps = {
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => void;
  onTheme: () => void;
  onSave: () => void;
};

// Component EditorToolbar nhận props
export default function EditorToolbar({
  onUndo,
  onRedo,
  onShare,
  onTheme,
  onSave
}: EditorToolbarProps) {
  const { toggle } = useContext(ThemeContext);

  return (
    <div className="fixed top-0 inset-x-0 h-12 bg-gray-900/80 backdrop-blur z-30 flex items-center px-3 space-x-2">
      <button
        onClick={onUndo}
        className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 14L4 9l5-5" />
          <path d="M20 20a8 8 0 00-8-8H4" />
        </svg>
      </button>

      <button
        onClick={onRedo}
        className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M15 14l5-5-5-5" />
          <path d="M4 20a8 8 0 018-8h8" />
        </svg>
      </button>

      <button
        onClick={onShare}
        className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
        </svg>
      </button>

      <button
        onClick={() => {
          onTheme();
          toggle(); // vẫn giữ theme toggle
        }}
        className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </button>

      <Button
        onClick={onSave}
        variant="gradient"
        size="sm"
        className="ml-auto"
      >
        Save
      </Button>

      <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/20 ml-2" />
    </div>
  );
}
