// src/hooks/useSync.ts
import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useLocalMindmap } from "./useLocalMindmap";
import { mindmapsApi } from "../services/mindmapsApi";
import { useMindmapsStore } from "../app/store/useMindmapsStore";

const DOC_KEY = "mm_guest_docs";

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
        content:
          docs[g.id]?.content ?? {
            nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } },
            edges: [],
          },
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
          const server = await mindmapsApi.list();
          set({
            items: server.map((m) => ({
              id: m.id,
              name: m.name,
              createdAt: m.createdAt,
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
