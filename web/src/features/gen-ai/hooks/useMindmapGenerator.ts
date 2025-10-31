/**
 * Hook cho logic GenAI.
 * (File này trước đó trống)
 */
import { useState } from 'react';
import { genAiApi } from '../api/genAiApi';
import { useEditorStore } from '../../editor/store/useEditorStore';
import { useToast } from '../../../core/hooks/useToast';
import { MindmapContent } from '../../../core/types';

export function useMindmapGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    // (Chúng ta sẽ cần addNodes/Edges vào store)
    // const { addNodesAndEdges } = useEditorStore(); 

    const generateChildren = async (mindmapId: string, nodeId: string) => {
        setIsLoading(true);
        addToast("AI đang suy nghĩ...", "info");
        try {
            const response = await genAiApi.suggestChildren({ mindmapId, nodeId });
            
            // TODO: Tích hợp logic `addNodesAndEdges` vào useEditorStore
            // và gọi nó ở đây.
            // addNodesAndEdges(response.generatedContent.nodes, response.generatedContent.edges);

            addToast("Đã thêm gợi ý từ AI!", "success");
        } catch (e: any) {
            console.error("GenAI failed:", e);
            addToast("Gợi ý AI thất bại.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return { isLoading, generateChildren };
}
