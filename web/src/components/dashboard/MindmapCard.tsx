import React from "react";
import { MindmapItem } from "../../app/store/useMindmapsStore";

export default function MindmapCard({ item }: { item: MindmapItem }) {
  return (
    <button onClick={() => (window.location.href=`/editor/${item.id}`)} className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 w-full h-24 text-left">
      <div className="text-white font-medium overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,#000_90%,transparent)]">
        <span className="inline-block animate-[marquee_6s_linear_infinite] will-change-transform">{item.name}</span>
      </div>
      <div className="text-gray-400 text-sm mt-1">{new Date(item.createdAt).toLocaleString()}</div>
    </button>
  );
}
