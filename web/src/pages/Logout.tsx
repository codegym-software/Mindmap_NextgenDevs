// src/pages/Logout.tsx
import { useEffect } from "react";
import { clearTokens } from "../services/authStorage";
import { getLogoutUrl } from "../auth/cognito";
import Spinner from "../components/common/Spinner";

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
export default function Logout() {
  useEffect(() => {
    clearTokens();
    window.location.href = getLogoutUrl();
  }, []);
  
  return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center gap-4"> 
          <Spinner className="w-8 h-8" />
          <span>Đang đăng xuất...</span>
      </div>
  );
}
