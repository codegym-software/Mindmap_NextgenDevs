// src/pages/Callback.tsx
import { useEffect, useContext, useRef } from "react"; // 1. Thêm 'useRef'
import { useNavigate } from "react-router-dom";
import { exchangeCodeForTokens } from "../auth/cognito";
import { AuthContext } from "../app/providers/AuthProvider";
import Spinner from "../components/common/Spinner";

export default function Callback() {
  const navigate = useNavigate();
  const { setAuthTokens } = useContext(AuthContext);

  // 2. Thêm cờ (flag) để ngăn React Strict Mode chạy 2 lần
  const hasRun = useRef(false);

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      // Handle OAuth errors from Cognito
      if (error) {
        console.error("OAuth error:", error, url.searchParams.get("error_description"));
        navigate("/dashboard", { replace: true });
        return;
      }

      // Check if code is present
      if (!code) {
        console.warn("Callback skipped: No authorization code found.");
        navigate("/dashboard", { replace: true });
        return;
      }

      try {
        const res = await exchangeCodeForTokens(code);
        
        // Save the tokens to global state and local storage
        setAuthTokens({
          access_token: res.access_token,
          id_token: res.id_token,
          refresh_token: res.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600),
        });

        // Trigger storage event for other tabs to sync
        window.dispatchEvent(new StorageEvent("storage", { key: "mm_tokens" }));
        
        // Navigate to the dashboard
        navigate("/dashboard", { replace: true });

      } catch (e) {
        console.error("Token exchange error:", e instanceof Error ? e.message : e);
        navigate("/dashboard", { replace: true });
      } finally {
        // Clean up the URL to remove the code and state parameters
        window.history.replaceState({}, document.title, "/dashboard");
      }
    };

    // 3. Chỉ chạy hàm 'run' nếu nó chưa chạy lần nào
    if (!hasRun.current) {
      hasRun.current = true; // Đánh dấu là đã chạy
      run();
    }
  }, [navigate, setAuthTokens]); // Giữ nguyên dependency array

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
      <Spinner className="w-8 h-8" />
      <span>Đang xử lý đăng nhập...</span>
    </div>
  );
}

