/**
 * Trang xử lý logic Đăng xuất.
 * Tái cấu trúc từ `pages/Logout.tsx` cũ (giữ nguyên logic).
 * Tuân thủ User Story #30.
 */
import React, { useEffect } from "react";
import { clearTokens } from "../services/authStorage"; // Sửa đường dẫn
import { getLogoutUrl } from "../services/cognito"; // Sửa đường dẫn
import Spinner from "../../../core/components/Spinner/Spinner"; // Sửa đường dẫn

const LogoutHandler: React.FC = () => {
    useEffect(() => {
        // Xóa token local
        clearTokens();
        // Chuyển hướng đến Cognito để logout toàn cục
        window.location.href = getLogoutUrl();
    }, []);

    // Giữ nguyên UI loading từ code gốc
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
            <Spinner className="w-8 h-8" />
            <span>Đang đăng xuất...</span>
        </div>
    );
}

export default LogoutHandler;

