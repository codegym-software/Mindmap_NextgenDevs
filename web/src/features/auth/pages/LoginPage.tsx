/**
 * Trang /login (Router #2).
 * Theo UX Flow, trang này chỉ trigger AuthModal trên trang Dashboard/Landing.
 * (File này trước đó trống)
 */
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/"; // Lấy trang trước đó

    useEffect(() => {
        // Trigger modal đăng nhập
        login('login');
    }, [login]);

    // Ngay lập tức điều hướng trở lại trang 'from'
    return <Navigate to={from} replace />;
};

export default LoginPage;

