// src/features/auth/pages/RegisterPage.tsx
/**
 * Trang /register (Router #3).
 * Tương tự LoginPage, chỉ trigger AuthModal.
 */
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RegisterPage: React.FC = () => {
    const { login, isAuthed } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthed) {
            login('register'); // Trigger modal ở chế độ 'register'
        }
    }, [isAuthed, login]);

    const from = location.state?.from || '/dashboard';
    
    return <Navigate to={from} replace />;
};

export default RegisterPage;
