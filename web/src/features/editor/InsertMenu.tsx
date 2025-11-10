import React from 'react';
import { IconNote, IconTag, IconLink, IconPaperclip, IconPhoto, IconSticker, IconMarker, IconMicrophone, IconMath, IconCheckbox } from '@tabler/icons-react';

interface InsertMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const menuItems: InsertMenuItem[] = [
  { id: 'note', label: 'Note', icon: <IconNote size={18} />, shortcut: 'Alt+N' },
  { id: 'label', label: 'Label', icon: <IconTag size={18} />, shortcut: 'Alt+L' },
  { id: 'hyperlink', label: 'Hyperlink', icon: <IconLink size={18} />, shortcut: 'Alt+H' },
  { id: 'attachment', label: 'Attachment', icon: <IconPaperclip size={18} />, shortcut: 'Alt+A' },
  { id: 'image', label: 'Image', icon: <IconPhoto size={18} />, shortcut: 'Alt+I' },
  { id: 'sticker', label: 'Sticker', icon: <IconSticker size={18} />, shortcut: 'Alt+S' },
  { id: 'marker', label: 'Marker', icon: <IconMarker size={18} />, shortcut: 'Alt+M' },
  { id: 'audio', label: 'Audio', icon: <IconMicrophone size={18} />, shortcut: 'Alt+R' },
  { id: 'latex', label: 'LaTeX', icon: <IconMath size={18} />, shortcut: 'Alt+T' },
  { id: 'task', label: 'Task', icon: <IconCheckbox size={18} />, shortcut: 'Alt+K' },
];

interface InsertMenuProps {
  position: { x: number; y: number } | null;
  onSelect: (type: string) => void;
  onClose: () => void;
  selectedNodeId: string | null;
}

const InsertMenu: React.FC<InsertMenuProps> = ({ position, onSelect, onClose, selectedNodeId }) => {
  if (!position) return null;

  return (
    <div 
      className="fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item) => (
        <button
          key={item.id}
          className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-3 text-gray-200"
          onClick={() => { onSelect(item.id); onClose(); }}
        >
          {item.icon}
          <span className="flex-grow">{item.label}</span>
          {item.shortcut && (
            <span className="text-gray-400 text-sm">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default InsertMenu;