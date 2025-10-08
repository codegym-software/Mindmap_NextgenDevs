import { create } from "zustand";

export type NodeData = { id: string; text: string; x: number; y: number; color?: string; };
export type EdgeData = { id: string; from: string; to: string; };

type State = {
  nodes: NodeData[];
  edges: EdgeData[];
  history: { nodes: NodeData[]; edges: EdgeData[] }[];
  future: { nodes: NodeData[]; edges: EdgeData[] }[];
  push: (n: NodeData[], e: EdgeData[]) => void;
  undo: () => void;
  redo: () => void;
  setGraph: (n: NodeData[], e: EdgeData[]) => void;
};

export const useEditorStore = create<State>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],
  push: (n, e) => set({ history: [...get().history, { nodes: get().nodes, edges: get().edges }], future: [], nodes: n, edges: e }),
  undo: () => {
    const h = get().history.slice();
    if (!h.length) return;
    const prev = h.pop()!;
    set({ future: [{ nodes: get().nodes, edges: get().edges }, ...get().future], history: h, nodes: prev.nodes, edges: prev.edges });
  },
  redo: () => {
    const f = get().future.slice();
    if (!f.length) return;
    const next = f.shift()!;
    set({ history: [...get().history, { nodes: get().nodes, edges: get().edges }], future: f, nodes: next.nodes, edges: next.edges });
  },
  setGraph: (n, e) => set({ nodes: n, edges: e }),
}));
