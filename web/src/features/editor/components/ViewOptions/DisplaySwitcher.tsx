/**
 * Component chọn Layout (Tree, Ngang, Tỏa tròn).
 * Tái cấu trúc từ code cũ.
 * Tuân thủ yêu cầu về layout (mặc dù radial chưa implement).
 */
import React, { useState } from 'react';
import { AlignCenter, ArrowRightLeft, CircleDotDashed } from 'lucide-react'; // Các icon layout
import Button from '../../../../core/components/Button/Button'; // Import Button

export type LayoutType = 'TB' | 'LR' | 'RADIAL'; // TB: Tree Vertical, LR: Tree Horizontal

interface DisplaySwitcherProps {
    onLayoutChange: (layout: LayoutType) => void;
    currentLayout: LayoutType; // Nhận layout hiện tại để highlight
}

const DisplaySwitcher: React.FC<DisplaySwitcherProps> = ({ onLayoutChange, currentLayout }) => {
    
    const layoutOptions: { type: LayoutType; label: string; icon: React.ReactNode }[] = [
        { type: 'TB', label: 'Cây (Dọc)', icon: <AlignCenter size={18} /> },
        { type: 'LR', label: 'Cây (Ngang)', icon: <ArrowRightLeft size={18} transform="rotate(90)" /> },
        // { type: 'RADIAL', label: 'Tỏa tròn', icon: <CircleDotDashed size={18}/> }, // Tạm ẩn
    ];

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center justify-center">
            <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-md rounded-full p-1 border border-gray-700/50 shadow-lg">
                {layoutOptions.map(({ type, label, icon }) => (
                    <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        onClick={() => onLayoutChange(type)}
                        className={`!rounded-full !px-3 !py-1.5 flex items-center gap-1.5
                            ${currentLayout === type 
                                ? '!bg-blue-600 text-white' 
                                : 'text-gray-300 hover:text-white hover:!bg-gray-700/70'}
                        `}
                        title={label}
                        aria-pressed={currentLayout === type}
                    >
                        {icon}
                        <span className="hidden sm:inline text-xs font-medium">{label}</span>
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default DisplaySwitcher;
