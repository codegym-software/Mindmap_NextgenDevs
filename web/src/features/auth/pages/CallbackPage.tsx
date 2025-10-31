// src/features/auth/pages/CallbackPage.tsx
/**
 * Trang Callback xử lý redirect từ Cognito (Google Login).
 * Tái cấu trúc từ `pages/Callback.tsx` cũ.
 * Tuân thủ Router #5.
 */
import React, { useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens } from "../services/cognito";
import { AuthContext } from "../providers/AuthProvider";
import Spinner from "../../../core/components/Spinner/Spinner";
import { useToast } from "../../../core/hooks/useToast";

const CallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setAuthTokens } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code");
            const error = searchParams.get("error");
            const errorDescription = searchParams.get("error_description");

            if (error) {
                console.error("OAuth error:", error, errorDescription);
                addToast(`Lỗi đăng nhập: ${errorDescription}`, "error");
                navigate("/dashboard", { replace: true });
                return;
            }

            if (!code) {
                console.warn("Callback skipped: No authorization code found.");
                navigate("/dashboard", { replace: true });
                return;
            }

            try {
                // Đổi code lấy tokens
                const tokens = await exchangeCodeForTokens(code);
                
                // Lưu tokens vào context/storage
                setAuthTokens(tokens);

                // Trigger storage event cho các tab khác
                window.dispatchEvent(new StorageEvent("storage", { key: "mindmap_tokens_v1" }));
                
                addToast("Đăng nhập thành công!", "success");
                
                // Chuyển hướng về dashboard
                navigate("/dashboard", { replace: true });

            } catch (e: any) {
                console.error("Token exchange error:", e);
                addToast(`Lỗi xác thực: ${e.message || 'Không rõ'}`, "error");
                navigate("/dashboard", { replace: true });
            } finally {
                // Xóa code khỏi URL
                // window.history.replaceState({}, document.title, "/dashboard");
            }
        };

        handleCallback();
    }, [navigate, searchParams, setAuthTokens, addToast]);

    return (
        <div className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" />
            <span className="text-lg text-gray-300">Đang xử lý đăng nhập...</span>
        </div>
    );
};

export default CallbackPage;
