// src/services/api.ts
import axios, { AxiosHeaders, AxiosError } from "axios";
import { loadTokens, saveTokens, clearTokens, type Tokens } from "./authStorage"; 
import { getCurrentUserSession } from "../auth/cognitoDirect"; 

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  "http://localhost:8081/api"; // Fallback URL nếu biến môi trường chưa set

const api = axios.create({ baseURL });

// --- REQUEST INTERCEPTOR (Xử lý Refresh Token trước khi gửi) ---
api.interceptors.request.use(async (config) => {
  const t = loadTokens();
  if (!t?.access_token) return config; 

  const now = Math.floor(Date.now() / 1000);
  // Kiểm tra 60 giây trước khi hết hạn
  const expiresSoon = (t.expires_at ?? 0) - now <= 60; 

  let accessToken = t.access_token; 

  if (expiresSoon) {
    console.log("[API] Token sắp hết hạn, đang refresh...");
    try {
      const session = await getCurrentUserSession(); 
      const newAccessToken = session.getAccessToken().getJwtToken();
      const newIdToken = session.getIdToken().getJwtToken();
      const newRefreshToken = session.getRefreshToken()?.getToken() ?? t.refresh_token;

      const next: Tokens = {
        access_token: newAccessToken,
        id_token: newIdToken,
        refresh_token: newRefreshToken,
        expires_at: session.getAccessToken().getExpiration(),
      };
      saveTokens(next); 
      accessToken = next.access_token; 
      
      // Emit event để AuthProvider cập nhật state nếu cần
      window.dispatchEvent(new StorageEvent("storage", { key: "mm_tokens" }));
    } catch (e) {
      console.error("[API] Interceptor refresh failed:", e);
      clearTokens();
      window.location.href = "/dashboard"; // Redirect về trang chủ thay vì reload
      return Promise.reject(new Error("Session expired, logging out."));
    }
  }

  if (!config.headers) config.headers = new AxiosHeaders();
  (config.headers as AxiosHeaders).set(
    "Authorization",
    `Bearer ${accessToken}`
  );
  return config;
}, (error) => {
    return Promise.reject(error);
});

// --- [NEW] RESPONSE INTERCEPTOR (Xử lý lỗi 401 từ Backend) ---
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Nếu lỗi là 401 (Unauthorized) và không phải là request đang retry
    if (error.response?.status === 401 && originalRequest) {
      console.warn("[API] Nhận lỗi 401 từ Backend. Token có thể không hợp lệ hoặc User bị khóa.");
      
      // Xóa token và logout người dùng
      clearTokens();
      
      // Dispatch event để UI cập nhật (UserAvatarMenu về guest)
      window.dispatchEvent(new StorageEvent("storage", { key: "mm_tokens" }));
      
      // Chuyển hướng về trang chủ hoặc trang login
      // window.location.href = "/dashboard"; 
      
      // Tùy chọn: Bạn có thể hiển thị Toast thông báo ở đây nếu tích hợp được
    }
    
    return Promise.reject(error);
  }
);

export default api;