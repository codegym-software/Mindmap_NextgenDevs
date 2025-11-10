// src/services/mindmapsApi.ts
import api from "./api";

export type MindmapDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  content: any;
  ownerSub?: string;
};

export const mindmapsApi = {
  // ===== Core CRUD =====
  list: async () => (await api.get<MindmapDto[]>("/mindmaps")).data,

  get: async (id: string) => (await api.get<MindmapDto>(`/mindmaps/${id}`)).data,

  create: async (payload: { name: string; content?: any }) =>
    (await api.post<MindmapDto>("/mindmaps", payload)).data,

  update: async (
    id: string,
    payload: Partial<{ name: string; content: any }>
  ) => (await api.put<MindmapDto>(`/mindmaps/${id}`, payload)).data,

  remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== Aliases =====
  updateName: async (id: string, name: string) =>
    (await api.put<MindmapDto>(`/mindmaps/${id}`, { name })).data,

  delete: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

  // ===== Guest → Server Sync =====
  // BE mong đợi List<MindmapUpsertRequest> => gửi MẢNG trực tiếp
  syncGuest: async (
    items: Array<{ name: string; content?: any; createdAt?: string }>
  ) => (await api.post<MindmapDto[]>("/mindmaps/sync", items)).data,

  // Tạo trên server và trả id để mở thẳng editor
  createAndOpen: async () =>
    await mindmapsApi.create({
      name: "Mindmap mới",
      content: {
        nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } },
        edges: [],
      },
    }),
};
