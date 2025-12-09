// src/pages/Callback.tsx
import { useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForTokens } from "../auth/cognito";
import { AuthContext } from "../app/providers/AuthProvider";
import Spinner from "../components/common/Spinner";
import api from "../services/api"; // Import API instance đã cấu hình

export default function Callback() {
  const navigate = useNavigate();
  const { setAuthTokens } = useContext(AuthContext);
  const hasRun = useRef(false);

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        console.error("OAuth error:", error, url.searchParams.get("error_description"));
        navigate("/dashboard", { replace: true });
        return;
      }

      if (!code) {
        console.warn("Callback skipped: No authorization code found.");
        navigate("/dashboard", { replace: true });
        return;
      }

      try {
        // 1. Đổi code lấy token từ Cognito
        const res = await exchangeCodeForTokens(code);
        
        const tokens = {
          access_token: res.access_token,
          id_token: res.id_token,
          refresh_token: res.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600),
        };

        // 2. Lưu token vào Context/Storage
        setAuthTokens(tokens);
        // Trigger event để các tab khác cập nhật (nếu cần)
        window.dispatchEvent(new StorageEvent("storage", { key: "mm_tokens" }));

        // 3. [QUAN TRỌNG] Gọi API Sync User ngay lập tức
        // Backend sẽ dùng Access Token trong header để lấy thông tin user từ Cognito và lưu vào DB
        try {
            console.log("Đang đồng bộ thông tin người dùng...");
            await api.post("/users/sync-cognito"); 
            console.log("Đồng bộ người dùng thành công.");
        } catch (syncError) {
            console.error("Lỗi khi đồng bộ user:", syncError);
            // Vẫn cho phép login nhưng có thể user profile sẽ thiếu trong DB
        }
        
        // 4. Chuyển hướng
        navigate("/dashboard", { replace: true });

      } catch (e) {
        console.error("Token exchange error:", e instanceof Error ? e.message : e);
        navigate("/dashboard", { replace: true });
      } finally {
        // Xóa query params trên URL để sạch đẹp
        window.history.replaceState({}, document.title, "/dashboard");
      }
    };

    if (!hasRun.current) {
      hasRun.current = true;
      run();
    }
  }, [navigate, setAuthTokens]);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center gap-4"> 
      <Spinner className="w-8 h-8" />
      <div className="flex flex-col items-center">
        <span className="font-semibold text-lg">Đang đăng nhập...</span>
        <span className="text-sm text-gray-500">Đang đồng bộ dữ liệu người dùng</span>
      </div>
    </div>
  );
}