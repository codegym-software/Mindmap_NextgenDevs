import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, Plus, Edit3, Link, Image, type LucideIcon } from 'lucide-react';

type MenuAction = {
  label: string;
  icon: LucideIcon;
  action: () => void;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
};

type Props = {
  x: number;
  y: number;
  onClose: () => void;
  items: MenuAction[];
};

export default function ContextMenu({ x, y, onClose, items }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        ref.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        ref.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div 
      ref={ref}
      className="fixed z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-100 py-1.5 w-56 animate-in"
      style={{ top: y, left: x }}
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.separator && <div className="h-px bg-gray-200 my-1" />}
          <button
            onClick={() => { 
              item.action(); 
              onClose(); 
            }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors
              ${item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700'}
            `}
          >
            <item.icon size={16} />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-400 font-mono">{item.shortcut}</span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
