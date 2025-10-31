/**
 * Component Icon (wrapper).
 * Tái cấu trúc từ file cũ.
 * Sử dụng `lucide-react` làm thư viện icon chính.
 */
import React from 'react';
import { icons, LucideProps } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface IconProps extends Omit<LucideProps, 'name'> {
    name: keyof typeof icons; // Tên icon phải có trong `lucide-react`
}

const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
    const LucideIcon = icons[name];

    if (!LucideIcon) {
        console.warn(`Icon "${name}" không tồn tại trong lucide-react.`);
        return null;
    }

    return (
        <LucideIcon
            className={twMerge("inline-block stroke-current", className)}
            {...props}
        />
    );
};

export default Icon;
