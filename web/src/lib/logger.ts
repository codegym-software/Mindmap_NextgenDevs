/**
 * Tiện ích logger đơn giản.
 * (File này trước đó trống)
 */
const isDevelopment = import.meta.env.DEV;

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log('%c[LOG]', 'color: #0ea5e9;', ...args); // Bright Blue
        }
    },
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn('%c[WARN]', 'color: #f59e0b;', ...args); // Amber
        }
    },
    error: (...args: any[]) => {
        // Luôn log lỗi
        console.error('%c[ERROR]', 'color: #ef4444;', ...args); // Red
    },
    info: (...args: any[]) => {
         if (isDevelopment) {
            console.info('%c[INFO]', 'color: #8b5cf6;', ...args); // Violet
        }
    }
};
