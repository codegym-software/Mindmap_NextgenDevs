/**
 * Guard (Route lồng) để bảo vệ các trang yêu cầu đăng nhập.
 * Tái cấu trúc từ `auth/guards/ProtectedRoute.tsx` cũ.
 * SỬA: Chuyển hướng về `/` (Landing Page) và mang theo state `login: true`
 * để tự động mở AuthModal (thay vì chuyển đến /dashboard).
 */
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import Spinner from '../core/components/Spinner/Spinner';

interface ProtectedRouteProps {
    allowGuests?: boolean; // Tùy chọn: cho phép guest (ví dụ: /editor/:id)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowGuests = false }) => {
    const { isAuthed, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Hiển thị loading spinner trong khi kiểm tra auth
        return (
            <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Nếu đã đăng nhập, cho phép truy cập
    if (isAuthed) {
        return <Outlet />;
    }

    // Nếu là guest và trang này cho phép guest (chỉ /editor/:id)
    if (allowGuests && location.pathname.startsWith('/editor/guest-')) {
        return <Outlet />;
    }
    
    // Nếu chưa đăng nhập (và không phải guest hợp lệ)
    // Chuyển hướng về trang chủ và yêu cầu đăng nhập
    return <Navigate to="/" state={{ from: location, login: true }} replace />;
};

export default ProtectedRoute;

