// src/components/dashboard/MindmapCardWithOptions.tsx
import React, { useState } from "react";
import { MindmapItem } from "../../app/store/useMindmapsStore";
import {
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type Props = {
  item: MindmapItem;
  onRename: (id: string, currentName: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
export default function MindmapCardWithOptions({ item, onRename, onShare, onDelete }: Props) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
      className="relative bg-white hover:bg-gray-50/80 rounded-lg w-full h-28 text-left transition-all duration-200 group border border-gray-200"
    >
      <button
        onClick={() => (window.location.href = `/editor/${item.id}`)}
        className="w-full h-full p-4 flex flex-col justify-between"
      >
        <div className="text-gray-900 font-medium overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,#000_90%,transparent)]"> 
          <span className="inline-block group-hover:animate-[marquee_6s_linear_infinite] will-change-transform">
            {item.name}
          </span>
        </div>
        <div className="text-gray-500 text-sm mt-1">Mở
          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
        </div>
      </button>

      {/* Options Menu */}
      {showOptions && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/50 border border-gray-200 rounded-full p-1"> 
          <button
            onClick={() => onRename(item.id, item.name)}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-900"
            title="Sửa tên"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onShare(item.id)}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-900"
            title="Chia sẻ"
          >
            <ShareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700"
            title="Xóa"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}