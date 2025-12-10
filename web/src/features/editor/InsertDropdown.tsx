import React, { useState, useRef, useEffect } from 'react';
import { PlusSquare, Link as LinkIcon, Image as ImageIcon, ChevronDown } from 'lucide-react';

type Props = {
  disabled: boolean;
  onInsertLink: () => void;
  onInsertImage: () => void;
};

export default function InsertDropdown({ disabled, onInsertLink, onInsertImage }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1 p-2 rounded-md text-gray-700 ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'
        }`}
        title="Chèn (Link, Ảnh...)"
      >
        <PlusSquare size={20} />
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1">
          <button
            onClick={() => handleSelect(onInsertLink)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <LinkIcon size={16} /> Chèn liên kết
          </button>
          <button
            onClick={() => handleSelect(onInsertImage)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <ImageIcon size={16} /> Chèn hình ảnh
          </button>
        </div>
      )}
    </div>
  );
}