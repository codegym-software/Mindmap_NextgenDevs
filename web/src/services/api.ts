// src/services/api.ts
import axios, { AxiosHeaders } from "axios";
// SỬA: Thêm clearTokens, thay đổi imports
import { loadTokens, saveTokens, clearTokens, type Tokens } from "./authStorage"; 
import { getCurrentUserSession } from "../auth/cognitoDirect"; // SỬA: Import từ cognitoDirect

const baseURL =
 import.meta.env.VITE_API_URL?.trim() ||
// ... existing code ...
 "/api";

const api = axios.create({ baseURL });

// SỬA: Cập nhật toàn bộ logic interceptor để dùng SDK
api.interceptors.request.use(async (config) => {
 const t = loadTokens();
 if (!t?.access_token) return config; // Không có token, cứ gửi request

 const now = Math.floor(Date.now() / 1000);
 // Kiểm tra 60 giây trước khi hết hạn
 const expiresSoon = (t.expires_at ?? 0) - now <= 60; 

 let accessToken = t.access_token; // Mặc định dùng token cũ

 if (expiresSoon) {
  // Token sắp hết hạn, thử làm mới bằng SDK
  try {
   const session = await getCurrentUserSession(); // SDK sẽ tự động refresh nếu cần
   const newAccessToken = session.getAccessToken().getJwtToken();
   const newIdToken = session.getIdToken().getJwtToken();
   const newRefreshToken = session.getRefreshToken()?.getToken() ?? t.refresh_token;

   const next: Tokens = {
    access_token: newAccessToken,
    id_token: newIdToken,
    refresh_token: newRefreshToken,
    expires_at: session.getAccessToken().getExpiration(),
   };
   saveTokens(next); // Lưu token mới
   accessToken = next.access_token; // Dùng token mới cho request này
  } catch (e) {
   console.error("API interceptor refresh failed:", e);
   // Refresh thất bại, xóa token và tải lại trang để logout
   clearTokens();
   window.location.reload(); 
   return Promise.reject(new Error("Session expired, logging out."));
  }
 }

 // Gán header Authorization với token (cũ hoặc mới)
 if (!config.headers) config.headers = new AxiosHeaders();
 (config.headers as AxiosHeaders).set(
  "Authorization",
  `Bearer ${accessToken}`
 );
 return config;
});

export default api;
