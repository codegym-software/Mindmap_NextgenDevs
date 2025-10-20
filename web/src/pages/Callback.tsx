// src/pages/Callback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForTokensPKCE } from "../auth/cognito";
import { saveTokens } from "../services/authStorage";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const err = url.searchParams.get("error");
      
      const expectedState = sessionStorage.getItem("pkce_state");
      const verifier = sessionStorage.getItem("pkce_verifier");
      const processed = sessionStorage.getItem("code_processed");

      // Xử lý lỗi OAuth
      if (err) {
        console.error("OAuth error:", err, url.searchParams.get("error_description"));
        navigate("/dashboard", { replace: true });
        return;
      }

      // Kiểm tra tính hợp lệ
      if (!code || !state || state !== expectedState || !verifier || processed === code) {
        console.warn("Callback skipped: Invalid parameters");
        navigate("/dashboard", { replace: true });
        return;
      }

      // Đánh dấu code đã xử lý ngay lập tức
      sessionStorage.setItem("code_processed", code);

      try {
        const res = await exchangeCodeForTokensPKCE(code, verifier);
        
        saveTokens({
          access_token: res.access_token,
          id_token: res.id_token,
          refresh_token: res.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600),
        });

        // Dọn dẹp PKCE
        sessionStorage.removeItem("pkce_state");
        sessionStorage.removeItem("pkce_verifier");
        sessionStorage.removeItem("code_processed");

        // Phát tín hiệu đồng bộ token cho các tab khác
        window.dispatchEvent(new StorageEvent("storage", { key: "mm_tokens" }));

        // Chuyển hướng về dashboard
        navigate("/dashboard", { replace: true });
      } catch (e) {
        console.error("Token exchange error:", e instanceof Error ? e.message : e);
        navigate("/dashboard", { replace: true });
      } finally {
        // Cleanup URL
        window.history.replaceState({}, document.title, "/");
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Đang xử lý đăng nhập…
    </div>
  );
}