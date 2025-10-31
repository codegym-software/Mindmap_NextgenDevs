// src/features/auth/pages/LoginPage.tsx
/**
 * Trang /login (Router #2).
 * Theo UX Flow, trang này chỉ trigger AuthModal trên trang Dashboard.
 */
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
    const { login, isAuthed } = useAuth();
    const location = useLocation();

    useEffect(() => {
        // Nếu chưa đăng nhập, trigger modal
        if (!isAuthed) {
            login('login');
        }
    }, [isAuthed, login]);

    // Luôn chuyển hướng về trang dashboard (nơi modal sẽ xuất hiện)
    // Hoặc về trang 'from' nếu có (ví dụ: từ ProtectedRoute)
    const from = location.state?.from || '/dashboard';
    
    return <Navigate to={from} replace />;
};

export default LoginPage;
