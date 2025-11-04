/**
 * Toolbar chính của Editor.
 * Tái cấu trúc từ `features/editor/EditorToolbar.tsx` cũ.
 * GIỮ NGUYÊN GIAO DIỆN 100%.
 * SỬA: Cập nhật logic và props để "đầy đủ" (thêm disable, export).
 */
import React from 'react';
import { Sun, Moon, Share2, Undo, Redo, Save, PanelRight, Home, Download } from 'lucide-react';
import UserAvatarMenu from '../../../shared/components/UserAvatarMenu';
import { useTheme } from '../../../../core/hooks/useTheme';

type EditorToolbarProps = {
    name: string;
    onNameChange: (v: string) => void;
    onCommitName: () => void;
    onHomeClick: () => void;
    onUndo: () => void;
    canUndo: boolean;
    onRedo: () => void;
    canRedo: boolean;
    onSave: () => void;
    isSaving: boolean;
    onExport: () => void;
    onShare: () => void;
    onToggleStylePanel: () => void;
};

const EditorToolbar: React.FC<EditorToolbarProps> = ({
    name, onNameChange, onCommitName,
    onHomeClick,
    onUndo, canUndo,
    onRedo, canRedo,
    onSave, isSaving,
    onExport,
    onShare,
    onToggleStylePanel
}) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="fixed top-0 left-0 right-0 h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center px-4 gap-2 z-40">
            <button
                onClick={onHomeClick}
                title="Về Dashboard"
                className="flex-shrink-0 p-2 rounded-md hover:bg-gray-700/60 text-white transition-colors"
            >
                <Home size={20} />
            </button>
            <div className="w-px h-6 bg-gray-700 mx-2 flex-shrink-0" />
            <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                onBlur={onCommitName}
                className="px-3 py-1.5 rounded-md bg-transparent text-white outline-none ring-1 ring-transparent hover:bg-gray-800 focus:bg-gray-800 focus:ring-blue-500 w-64 transition-all"
                placeholder="Đặt tên mindmap…"
                disabled={isSaving}
            />
            <div className="flex-grow" />
            <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-md hover:bg-gray-700 text-white disabled:text-gray-600 disabled:cursor-not-allowed" title="Hoàn tác (Ctrl+Z)">
                    <Undo size={20} />
                </button>
                <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-md hover:bg-gray-700 text-white disabled:text-gray-600 disabled:cursor-not-allowed" title="Làm lại (Ctrl+Y)">
                    <Redo size={20} />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-1" />
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2 disabled:bg-blue-800 disabled:cursor-wait"
                    title="Lưu (Ctrl+S)"
                >
                    <Save size={16} />
                    {isSaving ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                    onClick={onExport}
                    className="p-2 rounded-md hover:bg-gray-700 text-white"
                    title="Xuất (Ctrl+E)"
                >
                    <Download size={18} />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-1" />
                <button onClick={onShare} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Chia sẻ">
                    <Share2 size={20} />
                </button>
                <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Chuyển theme">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={onToggleStylePanel} className="p-2 rounded-md hover:bg-gray-700 text-white" title="Bật/tắt thanh định dạng (Ctrl+M)">
                    <PanelRight size={20} />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-1" />
                <UserAvatarMenu />
            </div>
        </div>
    );
};

export default EditorToolbar;