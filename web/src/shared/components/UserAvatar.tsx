/**
 * Component hiển thị Avatar (ảnh đại diện) hoặc chữ cái đầu.
 * Dùng cho ShareModal, AvatarGroup, UserMenu.
 */
import React, { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    title?: string;
}

const getInitialsColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 60%, 45%)`;
};

const UserAvatar: React.FC<UserAvatarProps> = ({
    src,
    name = '',
    size = 'md',
    className,
    title
}) => {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

    const backgroundColor = useMemo(() => getInitialsColor(name || '?'), [name]);

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
    }[size];

    return (
        <div
            className={twMerge(
                "relative flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white",
                sizeClasses,
                className
            )}
            title={title || name || undefined}
            style={{ backgroundColor: !src ? backgroundColor : undefined }}
        >
            {src ? (
                <img
                    src={src}
                    alt={name || 'Avatar'}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                    }}
                />
            ) : (
                initials
            )}
        </div>
    );
};

export default UserAvatar;