/**
 * Trang Callback xử lý redirect từ Cognito (Google Login).
 * Tái cấu trúc từ `pages/Callback.tsx` cũ (giữ nguyên logic).
 * Tuân thủ Router #5.
 */
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens } from "../services/cognito";
import { useAuth } from "../hooks/useAuth"; // Sửa đường dẫn
import Spinner from "../../../core/components/Spinner/Spinner"; // Sửa đường dẫn
import { useToast } from "../../../core/hooks/useToast";
import { Tokens } from "../../../core/types"; // Sửa đường dẫn

const CallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const { setAuthTokens } = useAuth(); // Dùng hook
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();

    useEffect(() => {
        const run = async () => {
            const code = searchParams.get("code");
            const error = searchParams.get("error");

            // Xử lý lỗi OAuth
            if (error) {
                console.error("OAuth error:", error, searchParams.get("error_description"));
                addToast(`Lỗi xác thực: ${searchParams.get("error_description") || error}`, "error");
                navigate("/", { replace: true }); // Về trang chủ
                return;
            }

            // Kiểm tra code
            if (!code) {
                console.warn("Callback skipped: No authorization code found.");
                navigate("/", { replace: true });
                return;
            }

            try {
                // Gọi cognito.ts (đã tái cấu trúc)
                const res = await exchangeCodeForTokens(code);
                
                const tokens: Tokens = {
                    access_token: res.access_token,
                    id_token: res.id_token,
                    refresh_token: res.refresh_token,
                    expires_at: Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600),
                };

                // Lưu tokens vào Context (Provider sẽ lo localStorage)
                setAuthTokens(tokens);

                addToast("Đăng nhập thành công!", "success");
                
                // Chuyển hướng đến Dashboard
                navigate("/dashboard", { replace: true });

            } catch (e: any) {
                console.error("Token exchange error:", e);
                addToast(`Lỗi khi đổi token: ${e.message || 'Lỗi không xác định'}`, "error");
                navigate("/", { replace: true });
            }
        };

        run();
    // Bỏ `addToast`, `Maps`, `setAuthTokens` khỏi dependency array (chúng là stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Giữ nguyên UI loading từ code gốc
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
            <Spinner className="w-8 h-8" />
            <span>Đang xử lý đăng nhập...</span>
        </div>
    );
}

export default CallbackPage;

