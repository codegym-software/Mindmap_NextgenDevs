// src/pages/Callback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { saveTokens } from "../services/authStorage";
import { exchangeCodeForTokensPKCE } from "../auth/cognito";

export default function Callback() {
  const nav = useNavigate();

  useEffect(() => {
    const once = sessionStorage.getItem("cb_ran");
    if (once) return;
    sessionStorage.setItem("cb_ran", "1");

    (async () => {
      const qs = new URLSearchParams(location.search);
      const code = qs.get("code");
      const state = qs.get("state");
      const expectedState = sessionStorage.getItem("pkce_state");
      const verifier = sessionStorage.getItem("pkce_verifier");

      if (!code || !state || state !== expectedState || !verifier) {
        console.error("PKCE state/verifier mismatch or missing code");
        nav("/dashboard", { replace: true });
        return;
      }

      try {
        const json = await exchangeCodeForTokensPKCE(code, verifier);
        saveTokens({
          access_token: json.access_token,
          id_token: json.id_token,
          refresh_token: json.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
        });
        // cleanup
        sessionStorage.removeItem("pkce_state");
        sessionStorage.removeItem("pkce_verifier");
        sessionStorage.removeItem("cb_ran");
        nav("/dashboard", { replace: true });
      } catch (e) {
        console.error("Token fetch error:", e);
        nav("/dashboard", { replace: true });
      }
    })();
  }, [nav]);

  return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Đang xử lý đăng nhập…</div>;
}
