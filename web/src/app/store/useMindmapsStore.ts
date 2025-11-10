// src/app/store/useMindmapsStore.ts
import { create } from "zustand";

export type MindmapItem = { id: string; name: string; createdAt: string; };

type State = {
  items: MindmapItem[];
  loading: boolean;
  error?: string;
  set: (p: Partial<State>) => void;
};

export const useMindmapsStore = create<State>((set) => ({
  items: [],
  loading: false,
  error: undefined,
  set: (p) => set(p),
}));
