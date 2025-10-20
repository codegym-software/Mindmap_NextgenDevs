// src/app/store/useEditorStore.ts
import { create } from "zustand";
import { isEqual } from "lodash"; // Cần cài `lodash` và `@types/lodash`

export type NodeData = { id: string; text: string; x: number; y: number; color?: string; parentId?: string; side?: "left" | "right"; collapsed?: boolean; };
export type EdgeData = { id: string; from: string; to: string };

type Snapshot = { nodes: NodeData[]; edges: EdgeData[] };

const MAX_HISTORY = 100;

type State = {
  nodes: NodeData[];
  edges: EdgeData[];
  history: Snapshot[];
  future: Snapshot[];
  setGraph: (n: NodeData[], e: EdgeData[]) => void;
  push: (n: NodeData[], e: EdgeData[]) => void;
  undo: () => Snapshot | null;
  redo: () => Snapshot | null;
  clear: () => void;
};

export const useEditorStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],

  setGraph: (n, e) => {
    set({ nodes: n, edges: e });
  },

  push: (n, e) => {
    const currentState: Snapshot = { nodes: n, edges: e };
    const lastHistoryState = get().history.at(-1);

    // FIX: Only push to history if the state has actually changed
    if (!lastHistoryState || !isEqual(lastHistoryState, currentState)) {
      const nextHistory = [...get().history, currentState].slice(-MAX_HISTORY);
      set({ history: nextHistory, future: [] });
    }
  },

  undo: () => {
    const h = get().history.slice();
    if (h.length <= 1) return null; // Keep the initial state

    const current = h.pop()!;
    const prev = h.at(-1)!;

    set({ 
        history: h, 
        future: [current, ...get().future], 
        nodes: prev.nodes, 
        edges: prev.edges 
    });
    return prev;
  },

  redo: () => {
    const f = get().future.slice();
    if (!f.length) return null;

    const next = f.shift()!;
    set({ 
        history: [...get().history, next], 
        future: f, 
        nodes: next.nodes, 
        edges: next.edges 
    });
    return next;
  },

  clear: () => set({ history: [], future: [] }),
}));