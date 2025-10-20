// src/hooks/useLocalMindmap.ts
import { useCallback } from "react";
import { useMindmapsStore } from "../app/store/useMindmapsStore";

const KEY = "mm_guest_maps";          // danh sách guest (dashboard)
const BUCKET = "mm_guest_docs";       // nội dung mindmap guest (editor)

export type GuestItem = { id: string; name: string; createdAt: string };

export function useLocalMindmap() {
  const set = useMindmapsStore((s: { set: any }) => s.set);

  // Load danh sách guest vào store
  const load = useCallback(() => {
    const raw = localStorage.getItem(KEY);
    const arr: GuestItem[] = raw ? JSON.parse(raw) : [];
    set({ items: arr });
  }, [set]);

  // List tất cả guest items
  const listGuests = useCallback((): GuestItem[] => {
    try { 
      return JSON.parse(localStorage.getItem(KEY) || "[]"); 
    } catch { 
      return []; 
    }
  }, []);

  // Tạo guest mới
  const createGuest = useCallback(() => {
    const arr: GuestItem[] = listGuests();
    const id = "guest-" + Date.now();
    const item: GuestItem = { 
      id, 
      name: "Mindmap mới", 
      createdAt: new Date().toISOString() 
    };
    const next = [item, ...arr].slice(0, 200); // Tăng limit lên 200
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ items: next });

    // Khởi tạo doc rỗng trong BUCKET
    const docs = JSON.parse(localStorage.getItem(BUCKET) || "{}");
    if (!docs[id]) {
      docs[id] = { 
        id, 
        name: item.name, 
        content: { 
          nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } }, 
          edges: [] 
        } 
      };
      localStorage.setItem(BUCKET, JSON.stringify(docs));
    }

    return item;
  }, [listGuests, set]);

  // Cập nhật tên guest
  const updateGuestName = useCallback((id: string, name: string) => {
    const arr: GuestItem[] = listGuests();
    const next = arr.map((x) => (x.id === id ? { ...x, name } : x));
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ items: next });
  }, [listGuests, set]);

  // Xóa guest
  const removeGuest = useCallback((id: string) => {
    // Xóa trong danh sách
    const arr: GuestItem[] = listGuests();
    const next = arr.filter((x) => x.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ items: next });

    // Xóa nội dung trong bucket
    const docs = JSON.parse(localStorage.getItem(BUCKET) || "{}");
    if (docs[id]) {
      delete docs[id];
      localStorage.setItem(BUCKET, JSON.stringify(docs));
    }
  }, [listGuests, set]);

  return { 
    load, 
    createGuest, 
    updateGuestName, 
    removeGuest, 
    listGuests 
  };
}