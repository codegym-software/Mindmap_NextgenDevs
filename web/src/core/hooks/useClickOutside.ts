/**
 * Hook tùy chỉnh để phát hiện click bên ngoài một element (Ref).
 * Hữu ích để đóng Modals, Dropdowns, Menus.
 */
import { useEffect, RefObject } from 'react';

type Event = MouseEvent | TouchEvent;

export function useClickOutside<T extends HTMLElement = HTMLElement>(
    ref: RefObject<T>,
    handler: (event: Event) => void
) {
    useEffect(() => {
        const listener = (event: Event) => {
            const el = ref.current;
            // Không làm gì nếu click vào chính element đó hoặc con của nó
            if (!el || el.contains((event.target as Node) || null)) {
                return;
            }
            handler(event); // Gọi callback
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]); // Chỉ chạy lại effect nếu ref hoặc handler thay đổi
}
