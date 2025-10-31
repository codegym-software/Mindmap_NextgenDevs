/**
 * Hook xử lý đồng bộ Guest maps lên server.
 * Tái cấu trúc từ `hooks/useSync.ts` cũ.
 * Sửa lỗi Hybrid: Đảm bảo content.nodes là List [].
 */
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useLocalMindmap } from "./useLocalMindmap";
import { mindmapsApi } from "../services/mindmapApi";
import { useToast } from "../../../core/hooks/useToast";
import { MindmapContent } from "../../../core/types";

// Key cho nội dung (giống hệt useLocalMindmap)
const GUEST_DOCS_KEY = "mindmap_guest_docs_v2";

/**
 * Hook này chạy một lần sau khi đăng nhập,
 * tìm tất cả mindmaps của Guest và đẩy chúng lên server.
 */
export function useSync(onSyncComplete: () => void) {
    const { isAuthed } = useAuth();
    const { listGuests } = useLocalMindmap();
    const { addToast } = useToast();
    const syncedOnce = useRef(false);

    // Hàm tạo payload, đã SỬA LỖI HYBRID
    const createSyncPayload = useCallback(() => {
        const guests = listGuests();
        if (guests.length === 0) return [];

        const docs = JSON.parse(localStorage.getItem(GUEST_DOCS_KEY) || "{}");
        
        return guests.map((g) => {
            const docContent = docs[g.id]?.content;
            
            // Tạo content mặc định (đúng chuẩn List) nếu không tìm thấy
            const defaultContent: MindmapContent = {
                nodes: [{ id: 'root', text: 'Chủ đề chính', x: 0, y: 0, level: 0, width: 150, height: 40, descendantCount: 0 }],
                edges: [],
            };
            
            let contentToSync = docContent || defaultContent;
            
            // *SỬA LỖI HYBRID*: Đảm bảo 'nodes' là List, phòng trường hợp
            // dữ liệu cũ (dạng object) còn sót lại.
            if (docContent && typeof docContent.nodes === 'object' && !Array.isArray(docContent.nodes)) {
                 console.warn(`Sync Warning: Guest map '${g.id}' has legacy 'nodes' object. Converting to array.`);
                 contentToSync.nodes = Object.values(docContent.nodes);
            }

            return {
                name: g.name,
                content: contentToSync,
                createdAt: g.createdAt, // Gửi ngày tạo gốc
            };
        });
    }, [listGuests]);

    useEffect(() => {
        if (isAuthed && !syncedOnce.current) {
            syncedOnce.current = true; // Chỉ chạy 1 lần

            const payload = createSyncPayload();
            if (payload.length === 0) {
                onSyncComplete(); // Không có gì để sync, chỉ cần fetch data
                return;
            }

            addToast(`Đang đồng bộ ${payload.length} mindmap (guest)...`, "info");
            
            mindmapsApi.syncGuest(payload)
                .then((response) => {
                    addToast(`Đồng bộ thành công ${response.createdMaps.length} mindmap!`, "success");
                    // Xóa sạch guest storage sau khi sync
                    localStorage.removeItem("mindmap_guest_maps_v1");
                    localStorage.removeItem(GUEST_DOCS_KEY);
                })
                .catch((error) => {
                    console.error("❌ Sync guest failed:", error);
                    addToast("Đồng bộ mindmap guest thất bại.", "error");
                })
                .finally(() => {
                    onSyncComplete(); // Luôn gọi fetch data (dù sync lỗi hay không)
                });
        }
    // `onSyncComplete` là 1 callback (ví dụ: `fetchData` từ DashboardPage), 
    // `createSyncPayload` cũng là useCallback.
    }, [isAuthed, createSyncPayload, onSyncComplete, addToast]);
}
