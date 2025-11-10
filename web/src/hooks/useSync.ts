// src/hooks/useSync.ts
import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useLocalMindmap } from "./useLocalMindmap";
import { mindmapsApi } from "../services/mindmapsApi";
import { useMindmapsStore } from "../app/store/useMindmapsStore";

const DOC_KEY = "mm_guest_docs";

export function useSync() {
  // FIX: Destructure 'isAuthed' directly from useAuth().
  const { isAuthed } = useAuth();
  const { load, listGuests } = useLocalMindmap();
  const { set } = useMindmapsStore();
  const syncedOnce = useRef(false);

  useEffect(() => {
    load();

    // FIX: Use the 'isAuthed' boolean directly in the condition.
    if (isAuthed && !syncedOnce.current) {
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
        .syncGuest(items)
        .then(async () => {
          // Clean up guest storage after successful sync
          localStorage.removeItem("mm_guest_maps");
          localStorage.removeItem("mm_guest_docs");

          // Reload list from the server
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
  // FIX: Update the dependency array to use 'isAuthed'.
  }, [isAuthed, load, listGuests, set]);
}