// src/pages/Logout.tsx
import { useEffect } from "react";
import { clearTokens } from "../services/authStorage";
import { getLogoutUrl } from "../auth/cognito";
import Spinner from "../components/common/Spinner";

export default function Logout() {
  useEffect(() => {
    clearTokens();
    window.location.href = getLogoutUrl();
  }, []);
  
  return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
          <Spinner className="w-8 h-8" />
          <span>Đang đăng xuất...</span>
      </div>
  );
}
