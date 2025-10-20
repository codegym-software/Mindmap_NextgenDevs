// src/services/api.ts
import axios, { AxiosHeaders } from "axios";
import { loadTokens, saveTokens, type Tokens } from "./authStorage";
import { refreshWithCognito } from "../auth/cognito";

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  import.meta.env.VITE_API_BASE?.trim() || // nếu bạn đã dùng tên này trước đó
  "/api";

const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  const t = loadTokens();
  if (!t?.access_token) return config;

  const now = Math.floor(Date.now() / 1000);
  const expiresSoon = (t.expires_at ?? 0) - now <= 60;

  if (expiresSoon && t.refresh_token) {
    try {
      const r = await refreshWithCognito(t.refresh_token);
      const next: Tokens = {
        access_token: r.access_token,
        id_token: r.id_token ?? t.id_token,
        refresh_token: t.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600),
      };
      saveTokens(next);
      if (!config.headers) config.headers = new AxiosHeaders();
      (config.headers as AxiosHeaders).set(
        "Authorization",
        `Bearer ${next.access_token}`
      );
      return config;
    } catch (e) {
      console.error("Token refresh failed:", e);
    }
  }

  if (!config.headers) config.headers = new AxiosHeaders();
  (config.headers as AxiosHeaders).set(
    "Authorization",
    `Bearer ${t.access_token}`
  );
  return config;
});

export default api;
