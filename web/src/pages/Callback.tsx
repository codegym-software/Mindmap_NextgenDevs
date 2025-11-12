// src/pages/Callback.tsx
import { useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForTokens } from "../auth/cognito";
import { AuthContext } from "../app/providers/AuthProvider";
import Spinner from "../components/common/Spinner";

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
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
        const res = await exchangeCodeForTokens(code);
        
        setAuthTokens({
          access_token: res.access_token,
          id_token: res.id_token,
          refresh_token: res.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (res.expires_in ?? 3600),
        });

        window.dispatchEvent(new StorageEvent("storage", { key: "mm_tokens" }));
        
        navigate("/dashboard", { replace: true });

      } catch (e) {
        console.error("Token exchange error:", e instanceof Error ? e.message : e);
        navigate("/dashboard", { replace: true });
      } finally {
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
      <span>Đang xử lý đăng nhập...</span>
    </div>
  );
}