/**
 * Hook tùy chỉnh để debounce (trì hoãn) một giá trị.
 * Rất hữu ích cho việc tự động lưu (autosave) hoặc tìm kiếm (search).
 */
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Thiết lập một timer
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Hủy timer nếu value thay đổi (hoặc component unmount)
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Chỉ chạy lại effect nếu value hoặc delay thay đổi

    return debouncedValue;
}
