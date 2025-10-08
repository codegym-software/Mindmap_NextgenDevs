import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import EditorToolbar from "../components/editor/EditorToolbar";
import DisplaySwitcher from "../components/editor/DisplaySwitcher";
import Sidebar from "../components/layout/Sidebar";
import Canvas from "../components/editor/Canvas";
import { useEditorStore } from "../app/store/useEditorStore";

type NodeT = { id: string; text: string; x: number; y: number; parentId?: string };
type Content = { nodes: Record<string, NodeT>; edges: { id: string; from: string; to: string }[] };

export default function Editor() {
  const { id } = useParams();
  const [mindmap, setMindmap] = useState<any>(null);
  const [content, setContent] = useState<Content>({ nodes: {}, edges: [] });
  const [selectedId, setSelectedId] = useState<string>("root");
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const stageRef = useRef<any>(null);
  const { setGraph } = useEditorStore();

  const load = async () => {
    if (!id) { // guest/new
      const guestContent = { nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } }, edges: [] };
      setMindmap({ id: "guest", name: "Mindmap mới" });
      setContent(guestContent);
      setGraph([guestContent.nodes.root], []); // Đồng bộ store
      setSelectedId("root");
      return;
    }
    const { data } = await api.get(`/mindmaps/${id}`);
    setMindmap(data);
    const serverContent = data.content || { nodes: { root: { id: "root", text: "Root", x: 0, y: 0 } }, edges: [] };
    setContent(serverContent);
    setGraph(Object.values(serverContent.nodes), serverContent.edges); // Đồng bộ store
    setSelectedId("root");
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const persist = async (updated: Content) => {
    setContent(updated);
    setGraph(Object.values(updated.nodes), updated.edges); // Đồng bộ store
    if (id && id !== "guest") await api.put(`/mindmaps/${id}`, { content: updated });
    // guest: TODO optional autosave localStorage
  };

  const addChild = (parentId: string) => {
    const nid = "n" + Math.random().toString(36).slice(2, 8);
    const parent = content.nodes[parentId];
    const node: NodeT = { id: nid, text: "", x: parent.x + 160, y: parent.y, parentId };
    const edges = [...content.edges, { id: "e" + nid, from: parentId, to: nid }];
    const updated: Content = { ...content, nodes: { ...content.nodes, [nid]: node }, edges };
    persist(updated);
    setSelectedId(nid);
    autoBalance(parentId);
  };

  const addSibling = (nodeId: string) => {
    const node = content.nodes[nodeId];
    const parentId = node.parentId || "root";
    if (parentId === "root") {
      addChild("root"); // Node gốc chỉ thêm con
      return;
    }
    const nid = "n" + Math.random().toString(36).slice(2, 8);
    const sibling: NodeT = { id: nid, text: "", x: node.x, y: node.y + 100, parentId };
    const edges = [...content.edges, { id: "e" + nid, from: parentId, to: nid }];
    const updated: Content = { ...content, nodes: { ...content.nodes, [nid]: sibling }, edges };
    persist(updated);
    setSelectedId(nid);
    autoBalance(parentId);
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === "root") return;
    const updated: Content = { ...content, nodes: { ...content.nodes }, edges: content.edges.filter(e => e.from !== nodeId && e.to !== nodeId) };
    const toDelete = new Set<string>();
    function dfs(i: string) {
      toDelete.add(i);
      Object.values(updated.nodes).forEach((n: NodeT) => {
        if (n.parentId === i) dfs(n.id);
      });
    }
    dfs(nodeId);
    for (const k of toDelete) delete updated.nodes[k];
    persist(updated);
    setSelectedId("root");
    autoBalance("root");
  };

  const autoBalance = (parentId: string) => {
    const children = Object.values(content.nodes).filter((n: NodeT) => n.parentId === parentId);
    const parent = content.nodes[parentId];
    const angleStep = children.length ? 360 / children.length : 0;
    children.forEach((child, i) => {
      const angle = i * angleStep;
      const rad = angle * (Math.PI / 180);
      child.x = parent.x + 200 * Math.cos(rad);
      child.y = parent.y + 200 * Math.sin(rad);
    });
    persist(content);
  };

  const onWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.02;
    const oldScale = scale;
    const mousePointTo = {
      x: (e.evt.x - pos.x) / oldScale,
      y: (e.evt.y - pos.y) / oldScale
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const newPos = {
      x: e.evt.x - mousePointTo.x * newScale,
      y: e.evt.y - mousePointTo.y * newScale
    };
    setScale(newScale);
    setPos(newPos);
  };

  const onDragBg = (e: any) => setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY });

  if (!mindmap) return <div className="p-6 text-slate-200">Loading editor...</div>;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950">
      <EditorToolbar
        onUndo={() => document.dispatchEvent(new Event("mm:undo"))}
        onRedo={() => document.dispatchEvent(new Event("mm:redo"))}
        onShare={() => navigator.clipboard.writeText(location.href)}
        onTheme={() => document.dispatchEvent(new Event("mm:theme"))}
        onSave={() => alert("Save: pdf/jpeg/docx (implement sau)")}
      />
      <Sidebar />
      <div className="pt-12 pl-12 w-full h-[calc(100vh-3rem)]">
        <Canvas mindmapId={id || null} onNodeSelect={setSelectedId} onContentChange={persist} />
      </div>
      <DisplaySwitcher onPick={(m) => window.dispatchEvent(new CustomEvent("mm:layout", { detail: m }))} />
    </div>
  );
}