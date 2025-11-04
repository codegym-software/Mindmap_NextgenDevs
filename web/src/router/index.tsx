/**
 * Định nghĩa Router chính của ứng dụng.
 * Tái cấu trúc từ `app/routes.tsx` cũ và tuân thủ 12 routes đã định nghĩa.
 * Sử dụng `App.tsx` làm root layout (chứa providers).
 */
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App'; // Root layout (providers)
import Spinner from '../core/components/Spinner/Spinner';

// --- Layouts ---
import AuthLayout from '../core/layouts/AuthLayout';
import MainLayout from '../core/layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import LandingPage from '../features/dashboard/pages/LoadingPage';

// --- Page Components (Lazy Loaded) ---
// (Fallback chung cho lazy loading)
const PageLoader: React.FC = () => (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
    </div>
);

// Auth Pages (Router #2, 3, 4, 5)
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
// const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage')); // (Sẽ tạo nếu cần)
const CallbackPage = lazy(() => import('../features/auth/pages/CallbackPage'));
const LogoutHandler = lazy(() => import('../features/auth/pages/LogoutHandler'));

// Main Pages (Router #1, 6, 7, 8, 9, 10, 11, 12)
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage')); // Router #6
const EditorPage = lazy(() => import('../features/editor/pages/EditorPage')); // Router #7, #8, #10
// const SharePage = lazy(() => import('../features/collaboration/pages/SharePage')); // Router #9 (Sẽ tạo)
// const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage')); // Router #11 (Sẽ tạo)
// const EmbedPage = lazy(() => import('../features/editor/pages/EmbedPage')); // Router #12 (Sẽ tạo)

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />, // Root layout chứa Providers
        children: [
            // === Public Routes (AuthLayout) ===
            // (AuthLayout chứa Header và Outlet)
            {
                element: <AuthLayout />,
                children: [
                    // Router #1: Landing Page
                    {
                        index: true,
                        element: <LandingPage />,
                    },
                    // Router #2, #3, #4: Các trang này chỉ trigger modal trên Landing/Dashboard
                    // Chúng ta tạo ra các "redirects" ảo
                    {
                        path: 'login',
                        element: <LoginPage />,
                    },
                    {
                        path: 'register',
                        element: <RegisterPage />,
                    },
                    {
                        path: 'forgot-password',
                        // (Trang này cũng sẽ redirect và trigger modal 'forgot')
                        element: <Navigate to="/" state={{ forgot: true }} replace />,
                    },
                    // Router #9: Trang Share (Public)
                    {
                        path: 'share/:token',
                        // element: <SharePage />, // (Chưa tạo)
                        element: <div>Trang Share (Chưa tạo)</div>,
                    },
                    // Router #12: Trang Embed (Public)
                    {
                        path: 'embed/:id',
                        // element: <EmbedPage />, // (Chưa tạo)
                        element: <div>Trang Embed (Chưa tạo)</div>,
                    },
                ],
            },

            // === Private Routes (MainLayout & ProtectedRoute) ===
            // (ProtectedRoute kiểm tra auth, MainLayout chứa Header/Sidebar)
            {
                element: <ProtectedRoute allowGuests={true} />, // Cho phép guest vào /editor/:id
                children: [
                    {
                        element: <MainLayout />, // Layout chung cho app (Header, Sidebar)
                        children: [
                            // Router #6: Dashboard
                            {
                                path: 'dashboard',
                                element: <DashboardPage />,
                            },
                            // Router #7: Tạo mới (Editor)
                            {
                                path: 'editor',
                                element: <EditorPage />, // EditorPage sẽ xử lý logic tạo mới
                            },
                            // Router #8 & #10: Chỉnh sửa (Editor) / Guest Mode
                            {
                                path: 'editor/:id',
                                element: <EditorPage />,
                            },
                            // Router #11: Cài đặt
                            {
                                path: 'settings',
                                // element: <SettingsPage />, // (Chưa tạo)
                                element: <div>Trang Settings (Chưa tạo)</div>,
                            },
                        ],
                    },
                ],
            },
            
            // === Auth Handling Routes (Không cần Layout) ===
            // Router #5: Callback
            {
                path: 'auth/callback',
                element: <CallbackPage />,
            },
            // Logout
            {
                path: 'logout',
                element: <LogoutHandler />,
            },
            
            // Fallback (Nếu không khớp route nào)
            {
                path: '*',
                element: <Navigate to="/" replace />,
            }
        ],
    },
]);

