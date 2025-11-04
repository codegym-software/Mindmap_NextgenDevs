/**
 * Component chọn Layout (Tree, Ngang, Tỏa tròn).
 * Tái cấu trúc từ `features/editor/DisplaySwitcher.tsx` cũ.
 * GIỮ NGUYÊN GIAO DIỆN 100% (chỉ sửa style nút).
 */
import React from 'react';
import { AlignCenter, ArrowRightLeft } from 'lucide-react';

export type LayoutType = 'TB' | 'LR' | 'RADIAL';

interface DisplaySwitcherProps {
    onPick: (mode: LayoutType) => void;
    currentLayout: LayoutType;
}

export default function DisplaySwitcher({ onPick, currentLayout }: DisplaySwitcherProps) {
    const layoutOptions: { type: LayoutType; label: string; icon: React.ReactNode }[] = [
        { type: 'TB', label: 'Cây (Dọc)', icon: <AlignCenter size={18} /> },
        { type: 'LR', label: 'Cây (Ngang)', icon: <ArrowRightLeft size={18} transform="rotate(90)" /> },
    ];

    return (
        <div className="fixed bottom-3 inset-x-0 flex items-center justify-center z-40">
            <div className="bg-gray-900/80 backdrop-blur-md rounded-full p-2 flex gap-1 border border-gray-700/50 shadow-lg">
                {layoutOptions.map(({ type, label, icon }) => (
                    <button
                        key={type}
                        onClick={() => onPick(type)}
                        title={label}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors
                            ${currentLayout === type
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}
                        `}
                    >
                        {icon}
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}