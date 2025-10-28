import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useLocalMindmap } from "./useLocalMindmap";
import { mindmapsApi, MindmapContent } from "../services/mindmapsApi"; // Import MindmapContent
import { useMindmapsStore } from "../app/store/useMindmapsStore";

const DOC_KEY = "mm_guest_docs";

// Hàm helper tạo nội dung mặc định (khớp BE)
const createDefaultContent = (): MindmapContent => ({
    nodes: [{ id: "root", text: "Root", x: 0, y: 0 }],
    edges: [],
});

export function useSync() {
    const { isAuthenticated } = useAuth();
    const { load, listGuests } = useLocalMindmap();
    const { set } = useMindmapsStore();
    const syncedOnce = useRef(false);

    useEffect(() => {
        load();

        if (isAuthenticated() && !syncedOnce.current) {
            syncedOnce.current = true;

            const guests = listGuests();
            if (guests.length === 0) return;

            const docs = JSON.parse(localStorage.getItem(DOC_KEY) || "{}");

            const items = guests.map((g) => ({
                name: g.name,
                // SỬA LỖI (Vấn đề 2):
                // Cập nhật cấu trúc 'content' mặc định từ Map sang List (Array)
                content: docs[g.id]?.content ?? createDefaultContent(),
                createdAt: g.createdAt,
            }));

            mindmapsApi
                .syncGuest(items) // gửi mảng
                .then(async () => {
                    // Xoá sạch guest storage
                    localStorage.removeItem("mm_guest_maps");
                    localStorage.removeItem("mm_guest_docs");

                    // Reload list từ server
                    set({ loading: true });
                    const serverItems = await mindmapsApi.list(); // serverItems là MindmapSummaryDto[]

                    // SỬA LỖI (Vấn đề 1 & 3):
                    // Ánh xạ dữ liệu mới (đầy đủ hơn) vào store
                    set({
                        items: serverItems.map((m) => ({
                            id: m.id,
                            name: m.name,
                            // (Giả sử BE đã thêm createdAt vào MindmapSummaryResponse)
                            createdAt: m.createdAt ?? m.updatedAt, // Dùng updatedAt nếu createdAt null
                            updatedAt: m.updatedAt,
                            ownerId: m.ownerId,
                        })),
                        loading: false,
                        error: undefined,
                    });
                })
                .catch((error) => {
                    console.error("❌ Sync guest failed:", error);
                });
        }
    }, [isAuthenticated, load, listGuests, set]);
}
