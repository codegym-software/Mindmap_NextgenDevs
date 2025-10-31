/**
 * Component hiển thị Avatar (ảnh đại diện) hoặc chữ cái đầu.
 * Dùng cho ShareModal, AvatarGroup, UserMenu.
 */
import React from 'react';
import { twMerge } from 'tailwind-merge';

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    status?: 'online' | 'offline' | null;
}

// Hàm hash đơn giản để tạo màu nền ngẫu nhiên
const getInitialsColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 40%)`; // Tông màu pastel đậm
};

const UserAvatar: React.FC<UserAvatarProps> = ({
    src,
    name = '?',
    size = 'md',
    className,
    status
}) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    const color = useMemo(() => getInitialsColor(name || '?'), [name]);

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
    }[size];
    
    const statusClasses = {
        online: 'bg-green-500',
        offline: 'bg-gray-500',
    }[status || 'offline'];
    
    const statusSizeClasses = {
        sm: 'w-1.5 h-1.5 bottom-0 right-0',
        md: 'w-2 h-2 bottom-0.5 right-0.5',
        lg: 'w-2.5 h-2.5 bottom-0.5 right-0.5',
    }[size];

    return (
        <div className={twMerge("relative flex-shrink-0", sizeClasses, className)}>
            {src ? (
                <img
                    src={src}
                    alt={name || 'Avatar'}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')} // Ẩn nếu ảnh lỗi
                />
            ) : (
                // Fallback với chữ cái đầu
                <div
                    className="w-full h-full rounded-full flex items-center justify-center font-medium text-white"
                    style={{ backgroundColor: color }}
                >
                    {initials}
                </div>
            )}
            
            {/* Ẩn fallback nếu ảnh lỗi */}
             {!src && (
                 <div
                    className="w-full h-full rounded-full flex items-center justify-center font-medium text-white absolute top-0 left-0"
                    style={{ backgroundColor: color }}
                >
                    {initials}
                </div>
             )}

            {/* Status Dot */}
            {status && (
                <span
                    className={twMerge(
                        "absolute rounded-full ring-2 ring-gray-800",
                        statusClasses,
                        statusSizeClasses
                    )}
                />
            )}
        </div>
    );
};

export default UserAvatar;
