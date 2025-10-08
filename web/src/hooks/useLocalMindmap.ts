import { useCallback } from "react";
import { useMindmapsStore } from "../app/store/useMindmapsStore";

const KEY = "mm_guest_maps";

export function useLocalMindmap() {
  const set = useMindmapsStore((s: { set: any; }) => s.set);
  const load = useCallback(() => {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    set({ items: arr });
  }, [set]);

  const createGuest = useCallback(() => {
    const raw = localStorage.getItem(KEY);
    const arr: any[] = raw ? JSON.parse(raw) : [];
    const id = "guest-" + Date.now();
    const item = { id, name: "Mindmap mới", createdAt: new Date().toISOString() };
    const next = [item, ...arr].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ items: next });
    return item;
  }, [set]);

  return { load, createGuest };
}
