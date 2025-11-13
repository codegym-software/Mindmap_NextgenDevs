// src/app/providers/AuthProvider.tsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { 
  loadTokens, 
  saveTokens, 
  clearTokens, 
  isExpired, // [MỚI] Import isExpired
  type Tokens 
} from "../../services/authStorage";
import { signOut } from "../../auth/cognitoDirect"; // Chỉ import signOut
import AuthModal from "../../features/auth/AuthModal";
import { refreshToken } from "../../services/AuthApi"; // [MỚI] Import refreshToken

// Decode JWT (Không thay đổi)
function decodeJwt(token: string) {
try {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
  atob(base64)
   .split("")
   .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
   .join("")
  );
  return JSON.parse(jsonPayload);
} catch {
  return null;
}
}

type AuthCtx = {
tokens: Tokens | null;
user: Record<string, any> | null;
isAuthed: boolean;
login: (initialMode?: 'login' | 'register') => void;
logout: () => void;
setAuthTokens: (t: Tokens | null) => void;
ensureFreshAccessToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthCtx>({
tokens: null,
user: null,
isAuthed: false,
login: () => {},
logout: () => {},
setAuthTokens: () => {},
ensureFreshAccessToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const [tokens, setTokensState] = useState<Tokens | null>(() => loadTokens());
const [user, setUser] = useState<Record<string, any> | null>(() => {
  const t = loadTokens();
  return t?.id_token ? decodeJwt(t.id_token) : null;
});

// State for Auth Modal (Không thay đổi)
const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
const [initialAuthMode, setInitialAuthMode] = useState<'login' | 'register'>('login');

const setAuthTokens = useCallback((t: Tokens | null) => {
  setTokensState(t);
  if (t) {
    saveTokens(t);
    if (t.id_token) {
      const decoded = decodeJwt(t.id_token);
      setUser(decoded);
    }
  } else {
    clearTokens();
    setUser(null);
  }
}, []);

// Đồng bộ localStorage (Không thay đổi)
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === "mm_tokens") {
      const latest = loadTokens();
      setTokensState(latest);
      setUser(latest?.id_token ? decodeJwt(latest.id_token) : null);
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, []);

const isAuthed = !!tokens?.access_token;

const login = useCallback((initialMode: 'login' | 'register' = 'login') => {
  setInitialAuthMode(initialMode);
  setIsAuthModalOpen(true);
}, []);

// Logic Logout (Không thay đổi)
const logout = useCallback(() => {
  signOut();
}, []);

/**
 * [ĐÃ CẬP NHẬT] Logic làm mới Token (Fix Lỗi Gốc)
 * * Thay thế `getCurrentUserSession()` (gây lỗi domain conflict)
 * bằng `refreshToken()` (gọi /oauth2/token).
 */
const ensureFreshAccessToken = useCallback(async () => {
  // 1. Lấy token hiện tại từ state (quan trọng, không phải localStorage)
  const currentTokens = tokens; 

  if (!currentTokens?.access_token) {
    throw new Error("No access token found.");
  }

  // 2. Kiểm tra xem token có SẮP hết hạn không
  // (isExpired check 30s trước khi hết hạn)
  if (!isExpired(currentTokens, 30)) {
    // 2a. Token vẫn còn tốt, trả về
    return currentTokens.access_token;
  }

  // 2b. Token đã hết hạn, cần làm mới
  if (!currentTokens.refresh_token) {
    throw new Error("No refresh token available.");
  }

  console.log("Access token expired, attempting refresh...");

  try {
    // 3. Gọi hàm refreshToken mới (từ AuthApi.ts)
    const newSession = await refreshToken(currentTokens.refresh_token);

    const newTokens: Tokens = {
      access_token: newSession.access_token,
      id_token: newSession.id_token,
      // [QUAN TRỌNG] Giữ lại refresh token CŨ,
      // vì Cognito /oauth2/token không trả về refresh token mới
      refresh_token: currentTokens.refresh_token, 
      expires_at: Math.floor(Date.now() / 1000) + (newSession.expires_in ?? 3600),
    };

    // 4. Lưu token mới vào context/localStorage
    setAuthTokens(newTokens);
    console.log("Token refresh successful.");
    
    // 5. Trả về access token MỚI
    return newTokens.access_token;

  } catch (error) {
    console.error("Token refresh failed (API):", error);
    // Nếu refresh thất bại (ví dụ: refresh token hết hạn), đăng xuất
    logout(); 
    throw new Error("Session expired, logging out.");
  }
}, [tokens, setAuthTokens, logout]); // Thêm 'tokens' làm dependency

const value = useMemo(
  () => ({
    tokens,
    user,
    isAuthed,
    login,
    logout,
    setAuthTokens,
    ensureFreshAccessToken,
  }),
  [tokens, user, isAuthed, login, logout, setAuthTokens, ensureFreshAccessToken]
);

return (
  <AuthContext.Provider value={value}>
    {children}
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      initialMode={initialAuthMode}
    />
  </AuthContext.Provider>
);
};