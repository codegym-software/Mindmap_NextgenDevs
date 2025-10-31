// src/features/auth/pages/LogoutHandler.tsx
/**
 * Trang xử lý logic Đăng xuất.
 * Tái cấu trúc từ `pages/Logout.tsx` cũ.
 * Tuân thủ User Story #30.
 */
import React, { useEffect } from "react";
import { clearTokens } from "../services/authStorage";
import { getLogoutUrl } from "../services/cognito";
import Spinner from "../../../core/components/Spinner/Spinner";

const LogoutHandler: React.FC = () => {
    useEffect(() => {
        // 1. Xóa tokens khỏi localStorage
        clearTokens();
        
        // 2. Chuyển hướng đến Cognito để đăng xuất global
        // Cognito sẽ tự động redirect về `LogoutRedirectUri` (đã config là /dashboard)
        window.location.href = getLogoutUrl();
    }, []);
    
    return (
        <div className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" />
            <span className="text-lg text-gray-300">Đang đăng xuất...</span>
        </div>
    );
};

export default LogoutHandler;
