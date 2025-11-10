// src/app/providers/AuthProvider.tsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { loadTokens, saveTokens, clearTokens, type Tokens } from "../../services/authStorage";
// import { getLogoutUrl } from "../../auth/cognito"; // <-- ĐÃ XÓA
import { getCurrentUserSession, signOut } from "../../auth/cognitoDirect"; // Import signOut là đủ
import AuthModal from "../../features/auth/AuthModal";

// Decode JWT (để lấy thông tin user từ id_token)
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

// State for Auth Modal
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

// Đồng bộ khi tab khác thay đổi localStorage
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

// SỬA Ở ĐÂY: Hàm logout đã được đơn giản hóa
const logout = useCallback(() => {
 // Hàm signOut() từ cognitoDirect.ts đã xử lý MỌI THỨ
 signOut();
}, []); // Dependency array rỗng

// THAY ĐỔI: Sử dụng SDK cognitoDirect để làm mới token
const ensureFreshAccessToken = useCallback(async () => {
 try {
 // SDK tự động kiểm tra token hiện tại và làm mới nếu cần
 const session = await getCurrentUserSession();

 const newAccessToken = session.getAccessToken().getJwtToken();
 const newIdToken = session.getIdToken().getJwtToken();
 // Lấy refresh token từ session (nếu nó được trả về - thường thì không đổi)
 // Hoặc giữ lại refresh token cũ từ state
 const newRefreshToken = session.getRefreshToken()?.getToken() ?? tokens?.refresh_token;

 const newTokens: Tokens = {
  access_token: newAccessToken,
  id_token: newIdToken,
  refresh_token: newRefreshToken,
  expires_at: session.getAccessToken().getExpiration(), // SDK trả về epoch seconds
 };

 // Chỉ cập nhật state nếu token thực sự thay đổi
 if (newAccessToken !== tokens?.access_token) {
  setAuthTokens(newTokens);
 }

 return newAccessToken;

 } catch (error) {
 console.error("Token refresh failed (SDK):", error);
 // Nếu refresh thất bại, đăng xuất người dùng
 logout(); // <-- Hàm logout này sẽ gọi signOut() đã được sửa
 return null;
 }
}, [tokens, setAuthTokens, logout]);

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

