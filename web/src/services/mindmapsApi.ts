// src/services/mindmapsApi.ts
import api from "./api";

export type MindmapDto = { id: string; name: string; createdAt: string; content?: any };

export const mindmapsApi = {
  list: async () => (await api.get<MindmapDto[]>("/mindmaps")).data,
  get: async (id: string) => (await api.get<MindmapDto>(`/mindmaps/${id}`)).data,
  create: async (payload: { name: string; content?: any }) => (await api.post<MindmapDto>("/mindmaps", payload)).data,
  update: async (id: string, payload: Partial<{ name: string; content: any }>) =>
    (await api.put<MindmapDto>(`/mindmaps/${id}`, payload)).data,
  remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // Guest -> Server: BE làm 1 endpoint nhận mảng guest maps rồi trả list id server
  // Ví dụ payload: { items: [{ name, content, createdAt }...] }
  // Bạn tạo endpoint /api/mindmaps/sync phía BE.
  syncGuest: async (items: Array<{ name: string; content?: any; createdAt: string }>) =>
    (await api.post<{ mapped: Array<{ localIndex: number; serverId: string }> }>("/mindmaps/sync", { items })).data,
};
