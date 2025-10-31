// Đây là file API client *chỉ dành cho Editor*.
// Nó sẽ thay thế file `services/mindmapApi.ts` cũ (bị deprecated)
// và file `features/editor/services/mindmapApi.ts` bạn đã tạo (đổi tên thư mục `services` -> `api`).
import api from '../../../lib/axios'; // Dùng instance axios chung
import { MindmapDetailResponse, MindmapContent } from '../../../core/types'; // Dùng types chung

// --- Type Definitions ---

// Payload cho PUT /api/mindmaps/{id}
type MindmapUpdatePayload = {
    name?: string;
    content?: MindmapContent;
    version?: number; // Hỗ trợ optimistic locking
};


// --- API Client ---
export const mindmapApi = {
    /**
     * Lấy dữ liệu chi tiết của mindmap (User Story #3)
     * GET /api/mindmaps/{id}
     */
    get: async (id: string): Promise<MindmapDetailResponse> => {
        const response = await api.get<MindmapDetailResponse>(`/mindmaps/${id}`);
        
        // --- Quan trọng: Chuẩn hóa dữ liệu từ BE ---
        // Đảm bảo content.nodes luôn là List<NodeData> (tuân thủ Hybrid)
        if (response.data.content && typeof response.data.content.nodes === 'object' && !Array.isArray(response.data.content.nodes)) {
             console.warn("BE API response 'nodes' as object, converting to array for FE store.");
             response.data.content.nodes = Object.values(response.data.content.nodes || {});
        } else if (!response.data.content?.nodes) {
             // Đảm bảo content.nodes là mảng rỗng nếu không có
             if(response.data.content) response.data.content.nodes = [];
             else response.data.content = { nodes: [], edges: []}; 
        }
        // Đảm bảo root node
         if (response.data.content.nodes.length === 0 || !response.data.content.nodes.find(n => n.id === 'root')) {
             response.data.content.nodes.unshift({ id: 'root', text: 'Chủ đề chính', x: 0, y: 0 });
         }

        return response.data;
    },

    /**
     * Cập nhật mindmap (name, content)
     * PUT /api/mindmaps/{id}
     */
    update: async (id: string, payload: MindmapUpdatePayload): Promise<MindmapDetailResponse> => {
        
        // Đảm bảo content.nodes gửi lên là List
        if (payload.content && typeof payload.content.nodes === 'object' && !Array.isArray(payload.content.nodes)) {
             console.error("Attempting to send 'nodes' as object. Converting to array.");
             payload.content.nodes = Object.values(payload.content.nodes);
        }

        const response = await api.put<MindmapDetailResponse>(`/mindmaps/${id}`, payload);
        
        // Chuẩn hóa response trả về (tương tự hàm get)
         if (response.data.content && typeof response.data.content.nodes === 'object' && !Array.isArray(response.data.content.nodes)) {
             response.data.content.nodes = Object.values(response.data.content.nodes || {});
         } else if (!response.data.content?.nodes) {
            if(response.data.content) response.data.content.nodes = [];
            else response.data.content = { nodes: [], edges: []};
         }

        return response.data;
    },

    /**
     * Xuất mindmap dạng text (User Story #35)
     * GET /api/mindmaps/{id}/export/text
     */
    exportAsText: async (id: string): Promise<string> => {
        // Giả sử BE trả về text/plain
        const response = await api.get<string>(`/api/mindmaps/${id}/export/text`, {
             headers: { 'Accept': 'text/plain' }
        });
        return response.data;
    },

    // Thêm các API khác cho editor nếu cần (e.g., GenAI, Link SaaS)
};
