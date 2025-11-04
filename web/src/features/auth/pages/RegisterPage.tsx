/**
 * Trang /register (Router #3).
 * Tương tự LoginPage, chỉ trigger AuthModal.
 * (File này trước đó trống)
 */
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RegisterPage: React.FC = () => {
    const { login } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/"; // Lấy trang trước đó

    useEffect(() => {
        // Trigger modal đăng ký
        login('register');
    }, [login]);

    // Ngay lập tức điều hướng trở lại trang 'from'
    return <Navigate to={from} replace />;
};

export default RegisterPage;

