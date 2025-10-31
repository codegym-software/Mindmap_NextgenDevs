// src/router/ProtectedRoute.tsx
/**
 * Guard (Route lồng) để bảo vệ các trang yêu cầu đăng nhập.
 * Tái cấu trúc từ `auth/guards/ProtectedRoute.tsx` cũ.
 * Tuân thủ Router #6, #7, #8, #11.
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import Spinner from '../core/components/Spinner/Spinner';

interface ProtectedRouteProps {
    allowGuests?: boolean; // Tùy chọn: cho phép guest (ví dụ: /editor/:id)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowGuests = false }) => {
    const { isAuthed, isLoading } = useAuth();

    if (isLoading) {
        // Hiển thị loading spinner trong khi AuthProvider đang kiểm tra state
        return (
            <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Lấy ID từ URL để kiểm tra guest
    const isGuestSession = window.location.pathname.startsWith('/editor/guest-');

    if (isAuthed) {
        // Đã đăng nhập, cho phép truy cập
        return <Outlet />;
    }

    if (allowGuests && isGuestSession) {
        // Cho phép guest vào trang /editor/guest-...
        return <Outlet />;
    }

    // Nếu không đăng nhập (và không phải guest được phép),
    // chuyển hướng về trang Landing (/) và trigger modal đăng nhập.
    // (Chúng ta sẽ dùng state của navigate để trigger modal)
    return <Navigate to="/" state={{ from: window.location.pathname, login: true }} replace />;
};

export default ProtectedRoute;
