/**
 * Cấu hình instance Axios trung tâm.
 * Tái cấu trúc từ `services/api.ts` cũ.
 * Bao gồm interceptor để tự động refresh token (User Story #27, #28).
 */
import axios, { AxiosHeaders } from "axios";
import { loadTokens, saveTokens, clearTokens, type Tokens } from "../features/auth/services/authStorage";
import { refreshWithCognito } from "../features/auth/services/cognito";
import { apiConfig } from "../config";

const api = axios.create({
    baseURL: apiConfig.baseURL,
    timeout: apiConfig.timeout,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Biến cờ để đảm bảo chỉ refresh một lần
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void, reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

/**
 * Request Interceptor:
 * 1. Lấy token từ storage.
 * 2. Kiểm tra token hết hạn (sắp hết hạn).
 * 3. Nếu sắp hết hạn, thực hiện refresh.
 * 4. Gắn token (mới hoặc cũ) vào header Authorization.
 */
api.interceptors.request.use(
    async (config) => {
        const tokens = loadTokens();
        if (!tokens?.access_token) {
            // Không có token, tiếp tục gửi request (cho các API public)
            return config;
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresSoon = (tokens.expires_at ?? 0) - now <= 60; // Sắp hết hạn trong 60s

        if (expiresSoon) {
            if (!tokens.refresh_token) {
                 // Không có refresh token, không thể làm mới
                console.warn("Access token expired, but no refresh token available.");
                clearTokens(); // Xóa token hỏng
                // Có thể trigger logout ở đây
                // window.location.href = '/logout'; 
                return Promise.reject(new Error("Session expired, no refresh token."));
            }

            if (isRefreshing) {
                // Đang có 1 request refresh khác chạy, thêm request này vào hàng đợi
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    if (config.headers) (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
                    return config;
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            // Đây là request đầu tiên cần refresh
            isRefreshing = true;
            try {
                const newTokensData = await refreshWithCognito(tokens.refresh_token);
                const newTokens: Tokens = {
                    ...tokens, // Giữ lại id_token, refresh_token cũ
                    access_token: newTokensData.access_token,
                    id_token: newTokensData.id_token ?? tokens.id_token, // Cập nhật id_token nếu có
                    expires_at: Math.floor(Date.now() / 1000) + (newTokensData.expires_in ?? 3600),
                };
                saveTokens(newTokens);
                
                if (config.headers) (config.headers as AxiosHeaders).set("Authorization", `Bearer ${newTokens.access_token}`);
                processQueue(null, newTokens.access_token); // Xử lý hàng đợi
                return config;
            } catch (error: any) {
                console.error("Token refresh failed:", error);
                processQueue(error, null); // Xử lý hàng đợi (báo lỗi)
                clearTokens(); // Xóa token hỏng
                // Chuyển hướng về trang login/dashboard
                window.location.href = '/dashboard'; 
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        // Token vẫn còn hạn, gắn vào và gửi đi
        if (config.headers) (config.headers as AxiosHeaders).set("Authorization", `Bearer ${tokens.access_token}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor (Optional but recommended):
 * Xử lý lỗi 401 (Unauthorized) toàn cục, ví dụ nếu token bị thu hồi.
 */
api.interceptors.response.use(
    (response) => response, // Trả về response nếu OK
    (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Xử lý 401 (ví dụ: token không hợp lệ)
            // Nếu không phải là lỗi refresh token, có thể thử refresh lại
            // (Nhưng logic request interceptor nên đã xử lý việc này)
            
            // Nếu 401 xảy ra *sau khi* đã refresh, có nghĩa là session thật sự hỏng
            console.error("401 Unauthorized - Logging out.");
            clearTokens();
            // Không dùng navigate() ở đây vì nó nằm ngoài React context
            window.location.href = '/dashboard'; 
        }
        return Promise.reject(error);
    }
);


export default api;
