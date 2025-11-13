// src/components/dashboard/MindmapCard.tsx
import React, { useState } from "react";
import { MindmapItem } from "../../app/store/useMindmapsStore";
import { Edit, Trash2, Share2, PanelLeftOpen } from "lucide-react";

type Props = { 
  item: MindmapItem;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
export default function MindmapCard({ item, onRename, onDelete, onShare }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRename = () => {
    const newName = prompt("Nhập tên mới:", item.name);
    if (newName && newName.trim() !== "") {
      onRename(item.id, newName.trim());
    }
  };

  return (
    <div className="relative group">
      <button 
        onClick={() => (window.location.href=`/editor/${item.id}`)} 
        className="bg-white hover:bg-gray-50/80 border border-gray-200 rounded-lg p-4 w-full h-32 text-left transition-all duration-200 group-hover:border-blue-500/50"
      >
        <div className="text-gray-900 font-medium text-lg overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,#000_90%,transparent)]"> 
          <span className="inline-block group-hover:animate-[marquee_6s_linear_infinite] will-change-transform">{item.name}</span>
        </div>
        <div className="text-gray-500 text-sm mt-2">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</div> 
      </button>

      {/* 3-dot Actions Menu */}
      <div className="absolute top-3 right-3">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 transition-opacity"
        >
          <PanelLeftOpen size={20} className="text-gray-600" /> 
        </button>
        
        {menuOpen && (
          <div 
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button onClick={handleRename} className="w-full text-left px-3 py-2 text-sm text-gray-700/90 hover:bg-gray-100 flex items-center gap-2"> 
              <Edit size={14} /> Đổi tên
            </button>
            <button onClick={() => onShare(item.id)} className="w-full text-left px-3 py-2 text-sm text-gray-700/90 hover:bg-gray-100 flex items-center gap-2"> 
              <Share2 size={14} /> Chia sẻ
            </button>
            <div className="h-px bg-gray-200 my-1" /> 
            <button onClick={() => onDelete(item.id)} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"> 
              <Trash2 size={14} /> Xóa Mindmap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
