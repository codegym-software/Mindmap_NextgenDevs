// src/services/api.ts
import axios, { AxiosHeaders } from "axios";
import { isExpired, loadTokens, saveTokens } from "./authStorage";
import { refreshWithCognito } from "../auth/cognito";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
});

api.interceptors.request.use(async (config) => {
  const t = loadTokens();
  if (!t?.access_token) return config;

  if (isExpired(t, 60) && t.refresh_token) {
    try {
      const r = await refreshWithCognito(t.refresh_token);
      const next = {
        ...t,
        access_token: r.access_token,
        id_token: r.id_token ?? t.id_token,
        expires_at: Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
      };
      saveTokens(next);

      config.headers = (config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers));
      (config.headers as AxiosHeaders).set("Authorization", `Bearer ${next.access_token}`);
      return config;
    } catch { /* send old */ }
  }

  config.headers = (config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers));
  (config.headers as AxiosHeaders).set("Authorization", `Bearer ${t.access_token}`);
  return config;
});

export default api;