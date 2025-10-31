// src/features/dashboard/components/MindmapCard.tsx
/**
 * Component Card hiển thị mindmap trong Dashboard Grid.
 * Tuân thủ User Story #2, #3, #4, #5.
 * Tái cấu trúc từ `features/dashboard/MindmapCard.tsx` cũ.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MindmapSummary } from '../store/useMindmapsStore';
import { MoreHorizontal, Edit, Trash2, Share2, Copy } from 'lucide-react';
import { useClickOutside } from '../../../core/hooks/useClickOutside';

// Helper format ngày
const formatRelativeDate = (isoDate: string) => {
    try {
        const date = new Date(isoDate);
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        
        if (diffSeconds < 60) return "vài giây trước";
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.round(diffHours / 24);
        if (diffDays <= 7) return `${diffDays} ngày trước`;
        
        return `ngày ${date.toLocaleDateString('vi-VN')}`;
    } catch (e) {
        return "không rõ";
    }
};

interface Props {
    item: MindmapSummary;
    onRename: (id: string, currentName: string) => void;
    onDelete: (id: string) => void;
    onShare: (id: string) => void;
    onDuplicate: (id: string) => void;
}

const MindmapCard: React.FC<Props> = ({ item, onRename, onDelete, onShare, onDuplicate }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Đóng menu khi click ra ngoài
    useClickOutside(menuRef, () => setMenuOpen(false));

    const handleRenameClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Ngăn Link kích hoạt
        e.stopPropagation();
        setMenuOpen(false);
        const newName = prompt("Nhập tên mới:", item.name);
        if (newName && newName.trim() && newName.trim() !== item.name) {
            onRename(item.id, newName.trim());
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
        onDelete(item.id); // DashboardPage sẽ mở Modal xác nhận
    };

    const handleShareClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
        onShare(item.id); // DashboardPage sẽ mở Modal Share
    };
    
    const handleDuplicateClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
        onDuplicate(item.id); // User Story #5
    };

    return (
        <div className="relative group">
            {/* Link bao ngoài card (User Story #3) */}
            <Link
                to={`/editor/${item.id}`}
                className="block bg-gray-800 hover:bg-gray-700/80 border border-gray-700/50 rounded-lg p-4 w-full h-36 text-left transition-all duration-200 group-hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
                {/* Tên Mindmap (User Story #2) */}
                <h3 className="text-white font-semibold text-base mb-2 overflow-hidden whitespace-nowrap text-ellipsis" title={item.name}>
                    {item.name}
                </h3>
                
                {/* Placeholder cho thumbnail */}
                <div className="flex-1 h-12 bg-gray-700/50 rounded mb-3"></div>

                {/* Ngày cập nhật (User Story #2) */}
                <div className="text-gray-400 text-xs">
                    Cập nhật: {formatRelativeDate(item.updatedAt)}
                </div>
            </Link>

            {/* Nút 3-dot (User Story #4, #5) */}
            <div ref={menuRef} className="absolute top-3 right-3">
                <button
                    onClick={(e) => {
                        e.preventDefault(); // Ngăn Link
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-opacity focus:opacity-100"
                    aria-label={`Tùy chọn cho ${item.name}`}
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                >
                    <MoreHorizontal size={18} />
                </button>

                {/* Menu Dropdown */}
                {menuOpen && (
                    <div
                        className="absolute top-full right-0 mt-1 w-44 bg-gray-800 border border-gray-700 rounded-md shadow-2xl z-20 py-1 animate-fade-in-down-sm"
                    >
                        <button onClick={handleRenameClick} className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700/80 hover:text-white flex items-center gap-2">
                            <Edit size={14} /> Đổi tên (F2)
                        </button>
                         <button onClick={handleDuplicateClick} className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700/80 hover:text-white flex items-center gap-2">
                            <Copy size={14} /> Nhân bản (Ctrl+D)
                        </button>
                        <button onClick={handleShareClick} className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700/80 hover:text-white flex items-center gap-2">
                            <Share2 size={14} /> Chia sẻ...
                        </button>
                        <div className="h-px bg-gray-700/50 my-1" />
                        <button onClick={handleDeleteClick} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/80 hover:text-white flex items-center gap-2">
                            <Trash2 size={14} /> Xóa (Delete)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MindmapCard;
