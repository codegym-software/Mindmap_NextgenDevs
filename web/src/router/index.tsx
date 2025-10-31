/**
 * Định nghĩa Router chính của ứng dụng.
 * Tái cấu trúc từ `app/routes.tsx` cũ và tuân thủ 12 routes đã định nghĩa.
 */
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Spinner from '../core/components/Spinner/Spinner';
import App from '../App'; // Import Root Layout

// --- Layouts ---
// MainLayout và AuthLayout sẽ được render *bên trong* App.tsx qua <Outlet>
import MainLayout from '../core/layouts/MainLayout';
import AuthLayout from '../core/layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// --- Page Components (Lazy Loaded) ---
// Dùng lazy loading để tăng tốc độ tải ban đầu

// Loading Fallback
const PageLoader: React.FC = () => (
    <div className="w-full h-[calc(100vh-56px)] flex items-center justify-center text-gray-400">
        <Spinner size="lg" className="mr-3" /> Đang tải trang...
    </div>
);

// --- Auth Pages (Router #1, 2, 3, 4, 5) ---
// Trang Landing Page (dùng AuthLayout)
// const LandingPage = lazy(() => import('../core/layouts/AuthLayout')); // AuthLayout là trang Landing
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/LoginPage')); // Tạm thời trỏ về Login
const CallbackPage = lazy(() => import('../features/auth/pages/CallbackPage'));
const LogoutHandler = lazy(() => import('../features/auth/pages/LogoutHandler'));

// --- App Pages (Router #6, 7, 8, 10, 11) ---
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const EditorPage = lazy(() => import('../features/editor/pages/EditorPage'));
// Trang Settings (Router #11) - Placeholder
const SettingsPage = () => <div className="p-8 pt-10 text-white">Trang Cài đặt (Đang phát triển)</div>;
// Trang Guest (Router #10) - Redirect
const GuestRedirect = () => <Navigate to="/editor" replace />; // /editor (không ID) sẽ tự tạo guest map

// --- Public Pages (Router #9, #12) ---
// Trang Share (Router #9) - Placeholder
const SharePage = () => <div className="p-8 pt-10 text-white">Trang Chia sẻ Công khai (Đang phát triển)</div>;
// Trang Embed (Router #12) - Placeholder
const EmbedPage = () => <div className="p-8 pt-10 text-white">Trang Nhúng (Đang phát triển)</div>;


// --- Định nghĩa 12 Routes ---
export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />, // Render Root Layout (với Providers)
        children: [
            // === Public Routes (Auth, Landing) ===
            {
                element: <AuthLayout />, // Layout cho trang Landing
                children: [
                    {
                        index: true, // Router #1: Landing Page
                        // AuthLayout tự nó là landing page, không cần component con
                        element: <></> 
                    },
                ]
            },
            {
                path: '/login', // Router #2
                element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>,
            },
            {
                path: '/register', // Router #3
                element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>,
            },
            {
                path: '/forgot-password', // Router #4
                element: <Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>, // Tạm
            },
            {
                path: '/auth/callback', // Router #5
                element: <Suspense fallback={<PageLoader />}><CallbackPage /></Suspense>,
            },
            {
                path: '/logout', // (Route tiện ích)
                element: <Suspense fallback={<PageLoader />}><LogoutHandler /></Suspense>,
            },
            {
                path: '/share/:token', // Router #9
                element: <Suspense fallback={<PageLoader />}><SharePage /></Suspense>,
            },
            {
                path: '/embed/:id', // Router #12
                element: <Suspense fallback={<PageLoader />}><EmbedPage /></Suspense>,
            },
            {
                path: '/guest', // Router #10
                element: <GuestRedirect />,
            },

            // === Protected Routes (Main App) ===
            // Các routes này dùng MainLayout và được bảo vệ
            {
                element: <MainLayout />, // Layout chung (Header,...)
                children: [
                    {
                        path: '/dashboard', // Router #6
                        element: (
                            <ProtectedRoute>
                                <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: '/editor', // Router #7 (Tạo mới)
                        element: (
                            <ProtectedRoute allowGuests={true}> {/* Cho phép Guest Mode */}
                                <Suspense fallback={<PageLoader />}><EditorPage /></Suspense>
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: '/editor/:id', // Router #8 (Chỉnh sửa)
                        element: (
                            <ProtectedRoute allowGuests={true}> {/* Cho phép Guest Mode */}
                                <Suspense fallback={<PageLoader />}><EditorPage /></Suspense>
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: '/settings', // Router #11
                        element: (
                            <ProtectedRoute>
                                <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
                            </ProtectedRoute>
                        ),
                    },
                ],
            },

             // --- Fallback Route ---
            {
                path: '*',
                element: <Navigate to="/" replace />,
            },
        ]
    },
   
]);
