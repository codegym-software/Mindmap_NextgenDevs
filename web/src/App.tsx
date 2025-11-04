/**
 * Component App gốc (Root Layout).
 * Tái cấu trúc dựa trên file bạn cung cấp ở GĐ 4.
 * Chịu trách nhiệm render các Context Providers toàn cục.
 * Sẽ được render bởi `router/index.tsx`.
 */
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './features/auth/providers/AuthProvider'; // Sửa đường dẫn
import { ThemeProvider } from './core/providers/ThemeProvider'; // Sửa đường dẫn
import { NotificationProvider } from './core/providers/NotificationProvider'; // Sửa đường dẫn
import Spinner from './core/components/Spinner/Spinner'; // Sửa đường dẫn

// Fallback component cho Suspense (lazy loading)
const FullPageSpinner: React.FC = () => (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center text-white">
        <Spinner size="lg" />
    </div>
);

/**
 * Root Layout Component
 * Bao bọc toàn bộ ứng dụng với các Context Providers cần thiết.
 */
const App: React.FC = () => {
    return (
        <React.StrictMode>
            <ThemeProvider>
                <NotificationProvider>
                    <AuthProvider>
                        {/* Suspense Fallback cho lazy-load pages */}
                        <Suspense fallback={<FullPageSpinner />}>
                            {/* Đây là nơi các trang (Pages) sẽ được render */}
                            <Outlet />
                        </Suspense>
                    </AuthProvider>
                </NotificationProvider>
            </ThemeProvider>
        </React.StrictMode>
    );
};

export default App;

