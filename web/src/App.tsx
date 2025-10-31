/**
 * Component App gốc.
 * Thay thế cho main.tsx cũ, component này sẽ là nơi chứa các Providers
 * và được render bởi `main.tsx`.
 *
 * CHỈNH SỬA: Dựa trên `main.tsx` cũ, logic Provider đã nằm ở `main.tsx`.
 * `App.tsx` nên là Root Layout, được sử dụng bởi React Router.
 */
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './features/auth/providers/AuthProvider';
import { ThemeProvider } from './core/providers/ThemeProvider';
import { NotificationProvider } from './core/providers/NotificationProvider';
import Spinner from './core/components/Spinner/Spinner';

/**
 * Root Layout Component
 * Bao bọc toàn bộ ứng dụng với các Context Providers cần thiết.
 * `RouterProvider` sẽ render `App` (nếu `App` là route gốc) và `App` sẽ render `Outlet` (các route con).
 */
const App: React.FC = () => {
    return (
        <React.StrictMode>
            <ThemeProvider>
                <NotificationProvider>
                    <AuthProvider>
                        {/* Suspense Fallback này dùng cho việc lazy-load
                          các trang (Pages) trong router/index.tsx
                        */}
                        <Suspense
                            fallback={
                                <div className="w-screen h-screen bg-gray-900 flex items-center justify-center text-white">
                                    <Spinner size="lg" />
                                </div>
                            }
                        >
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
