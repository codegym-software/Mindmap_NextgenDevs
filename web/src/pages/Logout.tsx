// src/pages/Logout.tsx
import { useEffect } from "react";
import { clearTokens } from "../services/authStorage";
import { getLogoutUrl } from "../auth/cognito";

export default function Logout() {
  useEffect(() => {
    clearTokens();
    window.location.href = getLogoutUrl();
  }, []);
  return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Đang đăng xuất…</div>;
}
