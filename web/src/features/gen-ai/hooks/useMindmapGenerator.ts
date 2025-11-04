/**
 * Hook cho logic GenAI.
 * (File này trước đó trống)
 */
import { useState } from 'react';
import { genAiApi } from '../api/genAiApi';
import { useToast } from '../../../core/hooks/useToast';

export function useMindmapGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const generateChildren = async (mindmapId: string, nodeId: string) => {
        setIsLoading(true);
        addToast("AI đang suy nghĩ...", "info");
        try {
            const response = await genAiApi.suggestChildren({ mindmapId, nodeId });
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