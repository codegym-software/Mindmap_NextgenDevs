import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    define: {
        global: 'window', // Định nghĩa global để tương thích với browser
    },
    resolve: {
        alias: {
            // Thêm alias để tránh xung đột (tùy chọn)
            // 'buffer': 'buffer',
        },
    },
});