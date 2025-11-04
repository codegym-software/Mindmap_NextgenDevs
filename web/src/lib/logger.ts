/**
 * Tiện ích logger đơn giản.
 * (File này trước đó trống)
 */
const isDevelopment = import.meta.env.DEV;

const COLORS = {
    log: '\x1b[34m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[35m',
    reset: '\x1b[0m'
};

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(`${COLORS.log}[LOG]${COLORS.reset}`, ...args);
        }
    },
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(`${COLORS.warn}[WARN]${COLORS.reset}`, ...args);
        }
    },
    error: (...args: any[]) => {
        console.error(`${COLORS.error}[ERROR]${COLORS.reset}`, ...args);
    },
    info: (...args: any[]) => {
         if (isDevelopment) {
            console.info(`${COLORS.info}[INFO]${COLORS.reset}`, ...args);
        }
    }
};