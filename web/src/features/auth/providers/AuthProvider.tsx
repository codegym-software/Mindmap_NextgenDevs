// src/features/auth/providers/AuthProvider.tsx
/**
 * Provider chính cho Authentication.
 * Quản lý state của user, tokens, modal đăng nhập.
 * Tái cấu trúc từ `app/providers/AuthProvider.tsx` cũ.
 */
import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import { loadTokens, saveTokens, clearTokens, type Tokens } from "../services/authStorage";
import { UserProfile } from "../../../core/types";
import { getLogoutUrl, refreshWithCognito } from "../services/cognito";
// Import AuthModal (sẽ được tạo ở GĐ2)
// import AuthModal from "../components/AuthModal/AuthModal"; // Tạm thời comment lại
const AuthModal = React.lazy(() => import('../components/AuthModal/AuthModal')); // Dùng lazy load

// --- Helper: Giải mã JWT ---
function decodeJwt(token: string): UserProfile | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload) as UserProfile;
    } catch (e) {
        console.error("Failed to decode JWT:", e);
        return null;
    }
}

// --- Định nghĩa Context Type ---
type AuthContextType = {
    tokens: Tokens | null;
    user: UserProfile | null;
    isAuthed: boolean;
    login: (initialMode?: 'login' | 'register') => void; // Mở modal (User Story #24, #27)
    logout: () => void; // User Story #30
    setAuthTokens: (t: Tokens | null) => void;
    ensureFreshAccessToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider Component ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    
    const [tokens, setTokensState] = useState<Tokens | null>(() => loadTokens());
    const [user, setUser] = useState<UserProfile | null>(() => {
        const t = loadTokens();
        return t?.id_token ? decodeJwt(t.id_token) : null;
    });

    // State cho Auth Modal
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthMode, setInitialAuthMode] = useState<'login' | 'register'>('login');

    // --- Callbacks ---
    
    const setAuthTokens = useCallback((t: Tokens | null) => {
        setTokensState(t);
        if (t) {
            saveTokens(t);
            setUser(t.id_token ? decodeJwt(t.id_token) : null);
        } else {
            clearTokens();
            setUser(null);
        }
    }, []);

    const login = useCallback((initialMode: 'login' | 'register' = 'login') => {
        setInitialAuthMode(initialMode);
        setIsAuthModalOpen(true);
    }, []);

    const logout = useCallback(() => {
        const cognitoLogoutUrl = getLogoutUrl();
        clearTokens();
        setTokensState(null);
        setUser(null);
        // Chuyển hướng đến Cognito để đăng xuất global
        window.location.href = cognitoLogoutUrl;
    }, []);

    // Đảm bảo access token luôn mới (dùng trong axios interceptor)
    const ensureFreshAccessToken = useCallback(async () => {
        const currentTokens = get(); // Lấy tokens từ state
        if (!currentTokens) return null;

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = currentTokens.expires_at ?? 0;
        
        // Cần refresh nếu hết hạn trong 60s tới
        if (expiresAt > now + 60) {
            return currentTokens.access_token;
        }

        if (!currentTokens.refresh_token) {
             console.warn("Access token expired, but no refresh token.");
             logout(); // Không thể refresh, đăng xuất
             return null;
        }

        try {
            const newCognitoTokens = await refreshWithCognito(currentTokens.refresh_token);
            const newTokens: Tokens = {
                ...currentTokens,
                access_token: newCognitoTokens.access_token,
                id_token: newCognitoTokens.id_token ?? currentTokens.id_token,
                expires_at: Math.floor(Date.now() / 1000) + (newCognitoTokens.expires_in ?? 3600),
            };
            setAuthTokens(newTokens); // Lưu token mới
            return newTokens.access_token;
        } catch (error) {
            console.error("Token refresh failed, logging out:", error);
            logout(); // Refresh thất bại, đăng xuất
            return null;
        }
    }, [setAuthTokens, logout]); // `get` của useState là stable

    // --- Effects ---
    // Đồng bộ state giữa các tab
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === "mindmap_tokens_v1") {
                const latest = loadTokens();
                setTokensState(latest);
                setUser(latest?.id_token ? decodeJwt(latest.id_token) : null);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // --- Context Value ---
    const value = useMemo(
        () => ({
            tokens,
            user,
            isAuthed: !!tokens?.access_token,
            login,
            logout,
            setAuthTokens,
            ensureFreshAccessToken,
        }),
        [tokens, user, login, logout, setAuthTokens, ensureFreshAccessToken]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
            {/* Tải lười AuthModal để tối ưu tốc độ tải ban đầu */}
            <React.Suspense fallback={null}>
                 {isAuthModalOpen && (
                    <AuthModal
                        isOpen={isAuthModalOpen}
                        onClose={() => setIsAuthModalOpen(false)}
                        initialMode={initialAuthMode}
                    />
                 )}
            </React.Suspense>
        </AuthContext.Provider>
    );
};
