// import { Stage, Layer, Group, Rect, Text, Line } from "react-konva";
// import { useEffect, useMemo, useRef, useState } from "react";
// import api from "../../services/api";
// import { useEditorStore } from "../../app/store/useEditorStore";

// type NodeData = { id: string; text: string; x: number; y: number; parentId?: string; color?: string };
// type Content = { nodes: Record<string, NodeData>; edges: { id: string; from: string; to: string }[] };

// const LOCAL_KEY = "mm_guest";

// function loadGuest(id: string): Content | null {
//   try {
//     const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
//     return all[id] || null;
//   } catch { return null; }
// }
// function saveGuest(id: string, data: Content) {
//   const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
//   all[id] = data; localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
// }

// export default function Canvas({ mindmapId, onNodeSelect, onContentChange }: {
//   mindmapId: string | null;
//   onNodeSelect: (id: string) => void;
//   onContentChange: (content: Content) => void;
// }) {
//   const isGuest = !mindmapId || mindmapId.startsWith("guest-");
//   const guestId = mindmapId || `guest-${Date.now()}`;
//   const [content, setContent] = useState<Content>({ nodes: {}, edges: [] });
//   const [selected, setSelected] = useState<string>("root");
//   const [scale, setScale] = useState(1);
//   const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
//   const [editing, setEditing] = useState<{ id: string; left: number; top: number } | null>(null);
//   const stageRef = useRef<any>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const [spacePan, setSpacePan] = useState(false);
//   const { setGraph } = useEditorStore();

//   const ensureRoot = (c: Content) => {
//     if (!c.nodes["root"]) {
//       c.nodes["root"] = { id: "root", text: "Root", x: 0, y: 0 };
//     }
//   };

//   useEffect(() => {
//     (async () => {
//       let data: Content;
//       if (isGuest) {
//         data = loadGuest(guestId) || { nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } }, edges: [] };
//       } else {
//         const { data: serverData } = await api.get(`/mindmaps/${mindmapId}`);
//         data = (serverData.content ?? { nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } }, edges: [] }) as Content;
//       }
//       ensureRoot(data);
//       setContent(data);
//       setGraph(Object.values(data.nodes), data.edges); // Đồng bộ store
//       setSelected("root");
//       focusEdit("root");
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mindmapId]);

//   useEffect(() => {
//     if (!editing) return;
//     if (!stageRef.current) return;
//     const { id } = editing;
//     const n = content.nodes[id];
//     const { x, y } = toScreen(n.x, n.y);
//     setEditing({ id, left: x - 60, top: y - 20 });
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [pos, scale]);

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (!selected) return;
//       if (e.key === " ") { setSpacePan(true); }
//       if (e.key === "Tab") {
//         e.preventDefault();
//         addChild(selected);
//       } else if (e.key === "Enter") {
//         e.preventDefault();
//         if (selected === "root") addChild(selected);
//         else addSibling(selected);
//       } else if (e.key === "Delete") {
//         e.preventDefault();
//         deleteNode(selected);
//       } else if (e.key.length === 1 && !editing) {
//         focusEdit(selected);
//         setTimeout(() => {
//           if (inputRef.current) {
//             inputRef.current.value = content.nodes[selected]?.text || "";
//             inputRef.current.focus();
//             inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
//           }
//         }, 0);
//       }
//     };
//     const onKeyUp = (e: KeyboardEvent) => { if (e.key === " ") setSpacePan(false); };
//     window.addEventListener("keydown", onKey);
//     window.addEventListener("keyup", onKeyUp);
//     return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
//   }, [selected, editing, content]);

//   function toScreen(nx: number, ny: number) {
//     return { x: pos.x + nx * scale, y: pos.y + ny * scale };
//   }
//   function fromScreen(sx: number, sy: number) {
//     return { x: (sx - pos.x) / scale, y: (sy - pos.y) / scale };
//   }

//   function persist(next: Content) {
//     setContent(next);
//     setGraph(Object.values(next.nodes), next.edges); // Đồng bộ store
//     onContentChange(next);
//     if (isGuest) saveGuest(guestId, next);
//     else api.put(`/mindmaps/${mindmapId}`, { content: next }).catch(() => {});
//   }

//   function addChild(parentId: string) {
//     const id = "n" + Math.random().toString(36).slice(2, 8);
//     const p = content.nodes[parentId];
//     const node: NodeData = { id, text: "", x: p.x + 160, y: p.y, parentId };
//     const edges = [...content.edges, { id: "e" + id, from: parentId, to: id }];
//     const next: Content = { nodes: { ...content.nodes, [id]: node }, edges };
//     layoutChildren(parentId, next);
//     persist(next);
//     setSelected(id);
//     onNodeSelect(id);
//     focusEdit(id);
//   }

//   function addSibling(nodeId: string) {
//     const n = content.nodes[nodeId];
//     const parentId = n.parentId || "root";
//     addChild(parentId);
//   }

//   function deleteNode(nodeId: string) {
//     if (nodeId === "root") return;
//     const next: Content = { nodes: { ...content.nodes }, edges: content.edges.filter(e => e.from !== nodeId && e.to !== nodeId) };
//     const toDel = new Set<string>();
//     (function dfs(id: string) {
//       toDel.add(id);
//       Object.values(next.nodes).forEach(x => { if (x.parentId === id) dfs(x.id); });
//     })(nodeId);
//     toDel.forEach(k => delete next.nodes[k]);
//     const parent = content.nodes[nodeId].parentId || "root";
//     layoutChildren(parent, next);
//     persist(next);
//     setSelected(parent);
//     onNodeSelect(parent);
//   }

//   function layoutChildren(parentId: string, data: Content = content) {
//     const p = data.nodes[parentId];
//     const kids = Object.values(data.nodes).filter(n => n.parentId === parentId).sort((a, b) => a.y - b.y);
//     const h = 80;
//     const total = kids.length;
//     kids.forEach((k, i) => {
//       const top = p.y - ((total - 1) * h) / 2 + i * h;
//       k.x = p.x + 160;
//       k.y = top;
//     });
//   }

//   function onDragNode(id: string, x: number, y: number) {
//     const n = content.nodes[id];
//     const next: Content = { ...content, nodes: { ...content.nodes, [id]: { ...n, x, y } } };
//     setContent(next);
//   }

//   function onDragNodeEnd(id: string, x: number, y: number) {
//     const n = content.nodes[id];
//     const next: Content = { ...content, nodes: { ...content.nodes, [id]: { ...n, x, y } } };
//     layoutChildren(id, next);
//     persist(next);
//   }

//   function focusEdit(id: string) {
//     const n = content.nodes[id]; if (!n) return;
//     const { x, y } = toScreen(n.x, n.y);
//     setEditing({ id, left: x - 60, top: y - 20 });
//     setTimeout(() => inputRef.current?.focus(), 0);
//   }

//   function commitEdit() {
//     if (!editing || !inputRef.current) return setEditing(null);
//     const text = inputRef.current.value;
//     const id = editing.id;
//     const n = content.nodes[id];
//     const next: Content = { ...content, nodes: { ...content.nodes, [id]: { ...n, text } } };
//     persist(next);
//     setEditing(null);
//   }

//   const edges = useMemo(() => {
//     return content.edges.map(e => {
//       const a = content.nodes[e.from], b = content.nodes[e.to];
//       if (!a || !b) return null;
//       return { id: e.id, from: a, to: b };
//     }).filter(Boolean) as { id: string; from: NodeData; to: NodeData }[];
//   }, [content]);

//   const onWheel = (e: any) => {
//     e.evt.preventDefault();
//     const scaleBy = 1.04;
//     const old = scale;
//     const mousePointTo = { x: (e.evt.x - pos.x) / old, y: (e.evt.y - pos.y) / old };
//     const newScale = e.evt.deltaY > 0 ? old / scaleBy : old * scaleBy;
//     const newPos = { x: e.evt.x - mousePointTo.x * newScale, y: e.evt.y - mousePointTo.y * newScale };
//     setScale(newScale); setPos(newPos);
//   };

//   const onDragBg = (e: any) => { if (spacePan) setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY }); };

//   return (
//     <div className="relative w-full h-full select-none">
//       {editing && (
//         <input
//           ref={inputRef}
//           defaultValue={content.nodes[editing.id]?.text || ""}
//           onBlur={commitEdit}
//           onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), commitEdit()) : null}
//           className="absolute z-50 px-2 py-1 rounded-md bg-white text-black outline-none"
//           style={{ left: editing.left, top: editing.top, width: 120 }}
//         />
//       )}
//       <Stage
//         ref={stageRef}
//         width={window.innerWidth}
//         height={window.innerHeight}
//         x={pos.x}
//         y={pos.y}
//         scaleX={scale}
//         scaleY={scale}
//         onWheel={onWheel}
//         onMouseMove={onDragBg}
//         onMouseDown={(e: any) => { if (e.evt.button === 1) setSpacePan(true); }}
//         onMouseUp={() => setSpacePan(false)}
//       >
//         <Layer>
//           {edges.map(e => {
//             const pts = [e.from.x + 120, e.from.y + 20, (e.from.x + e.to.x) / 2 + 80, (e.from.y + e.to.y) / 2, e.to.x, e.to.y + 20];
//             return <Line key={e.id} points={pts} stroke="#888" tension={0.5} bezier={false} />;
//           })}
//           {Object.values(content.nodes).map(n => (
//             <Group
//               key={n.id}
//               x={n.x}
//               y={n.y}
//               draggable
//               onDragMove={(e: any) => onDragNode(n.id, e.target.x(), e.target.y())}
//               onDragEnd={(e: any) => onDragNodeEnd(n.id, e.target.x(), e.target.y())}
//               onClick={() => { setSelected(n.id); onNodeSelect(n.id); }}
//               onDblClick={() => focusEdit(n.id)}
//             >
//               <Rect width={120} height={40} cornerRadius={10} fill="#1f2937" stroke={n.id === selected ? "#60a5fa" : "#6b7280"} strokeWidth={2} />
//               <Text text={(n.text || "").length ? n.text : "(nhập...)" } width={120} height={40} align="center" verticalAlign="middle" fill="#fff" />
//             </Group>
//           ))}
//         </Layer>
//       </Stage>
//     </div>
//   );
// }