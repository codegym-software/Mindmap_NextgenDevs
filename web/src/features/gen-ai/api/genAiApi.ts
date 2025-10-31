/**
 * API client cho GenAI (User Story #37*).
 * (File này trước đó trống)
 * Tuân thủ cấu trúc `api` mới.
 */
import api from '../../../lib/axios';
import { MindmapContent } from '../../../core/types';

/**
 * Payload cho POST /api/mindmaps/generate
 */
type GenAiRequest = {
    mindmapId: string;
    nodeId: string; // Node cha để gợi ý
    prompt?: string; // Prompt tùy chỉnh (nếu có)
};

/**
 * Response từ GenAI (Giả sử trả về một phần content)
 */
type GenAiResponse = {
    generatedContent: Partial<MindmapContent>; // Chỉ chứa nodes và edges mới
};

export const genAiApi = {
    /**
     * Gợi ý node con
     * Endpoint #18: POST /api/mindmaps/generate
     */
    suggestChildren: async (payload: GenAiRequest): Promise<GenAiResponse> => {
        console.warn("genAiApi.suggestChildren: Đang gọi endpoint giả định.");
        // const response = await api.post<GenAiResponse>('/mindmaps/generate', payload);
        // return response.data;

        // --- Mock Response (Placeholder) ---
        return new Promise(resolve => setTimeout(() => {
            const newId1 = `ai-node-${Date.now()}`;
            const newId2 = `ai-node-${Date.now() + 1}`;
            resolve({
                generatedContent: {
                    nodes: [
                        { id: newId1, text: "Ý tưởng AI 1", x: 0, y: 0, parentId: payload.nodeId },
                        { id: newId2, text: "Ý tưởng AI 2", x: 0, y: 0, parentId: payload.nodeId },
                    ],
                    edges: [
                        { from: payload.nodeId, to: newId1 },
                        { from: payload.nodeId, to: newId2 },
                    ]
                }
            });
        }, 800));
        // --- End Mock Response ---
    },
};
