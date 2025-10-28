import api from "./api";
// Import kiểu dữ liệu đã chuẩn hóa từ store
import { NodeData, EdgeData } from "../app/store/useEditorStore";

// SỬA LỖI (Vấn đề 1, 2, 3):
// Định nghĩa các kiểu DTO trả về từ BE

// Kiểu cho content (khớp MindmapContent.java)
export type MindmapContent = {
    nodes: NodeData[]; // Quan trọng: Đây là List (Array)
    edges: EdgeData[];
    theme?: any;
};

// Kiểu cho Dashboard (khớp MindmapSummaryResponse.java)
// (Tôi đã thêm các trường mà BE trả về trong 'toSummaryResponse')
export type MindmapSummaryDto = {
    id: string;
    name: string;
    ownerId: string;
    updatedAt: string; // ISO String
    tags: string[] | null;
    accessSettings: any;
    // Lưu ý: createdAt và lastEditedBy không có trong 'MindmapSummaryResponse' của BE
    // Nếu bạn cần chúng ở Dashboard, bạn phải sửa cả 'MindmapService.java' (phần 'toSummaryResponse')
    createdAt?: string;
};

// Kiểu cho Editor (khớp MindmapDetailResponse.java)
export type MindmapDetailDto = {
    id: string;
    name: string;
    ownerId: string;
    content: MindmapContent;
    updatedAt: string; // ISO String
    createdAt: string; // ISO String
    tags: string[] | null;
    accessSettings: any;
    collaborators: any[];
    // 4 trường bị thiếu đã được thêm vào
    workspaceId: string | null;
    lastEditedBy: string | null;
    version: number;
};


export const mindmapsApi = {
    // ===== Core CRUD =====
    // Sửa kiểu trả về
    list: async () => (await api.get<MindmapSummaryDto[]>("/mindmaps")).data,

    get: async (id: string) => (await api.get<MindmapDetailDto>(`/mindmaps/${id}`)).data,

    create: async (payload: { name: string; content?: MindmapContent }) =>
        (await api.post<MindmapDetailDto>("/mindmaps", payload)).data,

    update: async (
        id: string,
        // SỬA LỖI (Vấn đề 4): Thêm 'version' vào payload khi cập nhật
        // để hỗ trợ Optimistic Locking
        payload: Partial<{ name: string; content: MindmapContent; version: number }>
    ) => (await api.put<MindmapDetailDto>(`/mindmaps/${id}`, payload)).data,

    remove: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

    // ===== Aliases =====
    updateName: async (id: string, name: string) =>
        (await api.put<MindmapDetailDto>(`/mindmaps/${id}`, { name })).data,

    delete: async (id: string) => (await api.delete<void>(`/mindmaps/${id}`)).data,

    // ===== Guest → Server Sync =====
    syncGuest: async (
        items: Array<{ name: string; content?: MindmapContent; createdAt?: string }>
    ) => (await api.post<MindmapDetailDto[]>("/mindmaps/sync", items)).data,

    // Tạo trên server và trả id để mở thẳng editor
    createAndOpen: async () =>
        await mindmapsApi.create({
            name: "Mindmap mới",
            // SỬA LỖI (Vấn đề 2): Đổi 'nodes' từ Map thành List (Array)
            content: {
                nodes: [{ id: "root", text: "Root", x: 0, y: 0 }],
                edges: [],
            },
        }),
};
