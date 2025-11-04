/**
 * API client cho GenAI (User Story #37*).
 */
import api from '../../../lib/axios';
import { MindmapContent } from '../../../core/types';

type GenAiRequest = {
    mindmapId: string;
    nodeId: string;
    prompt?: string;
};

type GenAiResponse = {
    generatedContent: MindmapContent;
};

export const genAiApi = {
    suggestChildren: async (payload: GenAiRequest): Promise<GenAiResponse> => {
        console.warn("genAiApi.suggestChildren: Đang gọi endpoint giả định.");
        return new Promise(resolve => setTimeout(() => {
            const newId1 = `ai-node-${Date.now()}`;
            const newId2 = `ai-node-${Date.now() + 1}`;
            resolve({
                generatedContent: {
                    nodes: [
                        { id: newId1, text: "Ý tưởng AI 1", x: 0, y: 0, parentId: payload.nodeId, level: 0, width: 150, height: 40, descendantCount: 0 },
                        { id: newId2, text: "Ý tưởng AI 2", x: 0, y: 0, parentId: payload.nodeId, level: 0, width: 150, height: 40, descendantCount: 0 },
                    ],
                    edges: [
                        { id: `e-${newId1}`, from: payload.nodeId, to: newId1 },
                        { id: `e-${newId2}`, from: payload.nodeId, to: newId2 },
                    ]
                }
            });
        }, 800));
    },
};