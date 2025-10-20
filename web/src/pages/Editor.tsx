// src/pages/Editor.tsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Stage, Layer, Group, Rect, Text, Line } from "react-konva";
import { useDebouncedCallback } from 'use-debounce';

import EditorToolbar from "../components/editor/EditorToolbar";
import DisplaySwitcher from "../components/editor/DisplaySwitcher";
import Sidebar from "../components/layout/Sidebar";
import { useEditorStore, NodeData, EdgeData } from "../app/store/useEditorStore";
import { mindmapsApi } from "../services/mindmapsApi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { useTheme } from "../hooks/useTheme";
import Spinner from "../components/common/Spinner";

type Content = { nodes: Record<string, NodeData>; edges: EdgeData[] };
type MindmapDoc = { id?: string; name: string; content: Content };

const PADDING_X = 24, PADDING_Y = 12, MIN_W = 140, MIN_H = 44;
const GUEST_BUCKET = "mm_guest_docs";

// Helper functions for guest data
function loadGuestDoc(id: string): MindmapDoc | null {
  try {
    const raw = localStorage.getItem(GUEST_BUCKET);
    return raw ? JSON.parse(raw)[id] || null : null;
  } catch { return null; }
}
function saveGuestDoc(id: string, doc: MindmapDoc) {
  const all = JSON.parse(localStorage.getItem(GUEST_BUCKET) || "{}");
  all[id] = doc;
  localStorage.setItem(GUEST_BUCKET, JSON.stringify(all));
}

export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const isGuest = !!id && id.startsWith("guest-");

  const [doc, setDoc] = useState<MindmapDoc | null>(null);
  const [name, setName] = useState("Loading...");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("root");
  
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isPanning, setIsPanning] = useState(false);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const editingInputRef = useRef<HTMLTextAreaElement>(null);

  const { push: pushHistory, undo, redo, setGraph, clear: clearHistory } = useEditorStore();

  // --- Data Loading Logic ---
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const loadData = async () => {
      // **FIX: Logic for creating a new guest mindmap**
      if (!id) {
        if (isAuthenticated()) {
          navigate("/dashboard", { replace: true });
          return;
        }
        const newId = "guest-" + Date.now();
        const newDoc: MindmapDoc = {
          name: "Mindmap nháp",
          content: { nodes: { root: { id: "root", text: "Chủ đề chính", x: 0, y: 0 } }, edges: [] },
        };
        saveGuestDoc(newId, newDoc);
        navigate(`/editor/${newId}`, { replace: true });
        return; // Exit after navigation
      }

      // **FIX: Logic for loading existing mindmap**
      try {
        let data: MindmapDoc | null = null;
        if (isGuest) {
          data = loadGuestDoc(id) || { name: "Mindmap Lỗi", content: { nodes: {}, edges: [] }};
        } else {
          data = await mindmapsApi.get(id);
        }

        if (!data.content?.nodes?.root) {
          data.content = { nodes: { root: { id: "root", text: "Chủ đề chính", x: 0, y: 0 } }, edges: [] };
        }

        if (isMounted) {
          setDoc(data);
          setName(data.name);
          clearHistory();
          setGraph(Object.values(data.content.nodes), data.content.edges);
          setSelectedNodeId("root");
        }

      } catch (error) {
        console.error("Failed to load mindmap:", error);
        if (isMounted) {
            addToast("Không thể tải mindmap!", "error");
            navigate("/dashboard", { replace: true });
        }
      }
    };

    loadData();

    return () => {
      isMounted = false; // Cleanup function to set flag
    };
  }, [id]); // **FIX: Only re-run when the 'id' parameter changes**

  // --- Persistence Logic ---
  const debouncedSave = useDebouncedCallback((updatedDoc: MindmapDoc) => {
    if (isGuest) {
      saveGuestDoc(id!, updatedDoc);
    } else {
      mindmapsApi.update(id!, { name: updatedDoc.name, content: updatedDoc.content }).catch(e => {
        console.error("Save failed:", e);
        addToast("Lưu thất bại", "error");
      });
    }
  }, 1000);

  const updateAndPersist = useCallback((newContent: Content, newName?: string) => {
    if (!doc) return;
    
    pushHistory(Object.values(doc.content.nodes), doc.content.edges);

    const updatedDoc: MindmapDoc = { ...doc, name: newName ?? name, content: newContent };
    setDoc(updatedDoc);
    if(newName) setName(newName);
    
    debouncedSave(updatedDoc);
  }, [doc, name, pushHistory, debouncedSave]);
  
  const updateNameAndPersist = (newName: string) => {
    if (!doc || newName === name) return;
    setName(newName);
    const updatedDoc: MindmapDoc = { ...doc, name: newName };
    setDoc(updatedDoc);
    debouncedSave(updatedDoc);
  }

  // --- Keyboard & Event Handlers ---
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState && doc) {
      const newContent = { nodes: Object.fromEntries(prevState.nodes.map(n => [n.id, n])), edges: prevState.edges };
      const updatedDoc = { ...doc, content: newContent };
      setDoc(updatedDoc);
      debouncedSave(updatedDoc);
    }
  }, [doc, undo, debouncedSave]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState && doc) {
      const newContent = { nodes: Object.fromEntries(nextState.nodes.map(n => [n.id, n])), edges: nextState.edges };
      const updatedDoc = { ...doc, content: newContent };
      setDoc(updatedDoc);
      debouncedSave(updatedDoc);
    }
  }, [doc, redo, debouncedSave]);

  // All other functions (getNodeBox, editingNodePosition, startEditing, stopEditing, handleAddChild, etc.) remain largely the same.
  // The important part is that the event handlers below are now stable and won't be broken by the render loop.
  const getNodeBox = useCallback((nodeText: string) => {
    const lines = (nodeText || "").split("\n");
    const longest = Math.max(...lines.map((line) => line.length), 5);
    const w = Math.max(MIN_W, longest * 8 + PADDING_X * 2);
    const h = Math.max(MIN_H, lines.length * 18 + PADDING_Y * 2);
    return { w, h };
  }, []);

  const startEditing = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
    setTimeout(() => editingInputRef.current?.focus(), 0);
  }, []);

  const stopEditing = useCallback((save: boolean) => {
    if (!editingNodeId || !doc) return;
    
    const node = doc.content.nodes[editingNodeId];
    const newText = editingInputRef.current?.value ?? node.text;
    
    setEditingNodeId(null);

    if (save && newText !== node.text) {
      const newNodes = { ...doc.content.nodes, [editingNodeId]: { ...node, text: newText } };
      updateAndPersist({ ...doc.content, nodes: newNodes });
    }
  }, [doc, editingNodeId, updateAndPersist]);

  const handleAddChild = useCallback((parentId: string) => {
    if (!doc) return;
    const parent = doc.content.nodes[parentId];
    if (!parent) return;

    const newId = "n" + Date.now();
    const newNode: NodeData = { id: newId, text: "", x: parent.x + 200, y: parent.y, parentId };
    const newEdge: EdgeData = { id: `e-${newId}`, from: parentId, to: newId };
    
    const newNodes = { ...doc.content.nodes, [newId]: newNode };
    const newEdges = [...doc.content.edges, newEdge];

    const children = Object.values(newNodes).filter(n => n.parentId === parentId);
    children.forEach((child, index) => {
        child.y = parent.y + (index - (children.length - 1) / 2) * 80;
        child.x = parent.x + 200;
    });

    updateAndPersist({ nodes: newNodes, edges: newEdges });
    startEditing(newId);
  }, [doc, updateAndPersist, startEditing]);

  const handleAddSibling = useCallback((nodeId: string) => {
    if (nodeId === 'root' || !doc) return handleAddChild('root');
    const parentId = doc.content.nodes[nodeId]?.parentId;
    if (parentId) handleAddChild(parentId);
  }, [doc, handleAddChild]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root' || !doc) return;

    const nodesToDelete = new Set<string>([nodeId]);
    const findChildren = (id: string) => {
      Object.values(doc.content.nodes).forEach(n => {
        if (n.parentId === id) {
          nodesToDelete.add(n.id);
          findChildren(n.id);
        }
      });
    };
    findChildren(nodeId);

    const newNodes = { ...doc.content.nodes };
    nodesToDelete.forEach(id => delete newNodes[id]);
    const newEdges = doc.content.edges.filter(e => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to));
    
    const parentId = doc.content.nodes[nodeId]?.parentId ?? 'root';
    updateAndPersist({ nodes: newNodes, edges: newEdges });
    setSelectedNodeId(parentId);
  }, [doc, updateAndPersist]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingNodeId) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stopEditing(true); } 
        else if (e.key === 'Escape') { stopEditing(false); }
        return;
    }

    if (e.key === 'Tab') { e.preventDefault(); handleAddChild(selectedNodeId); } 
    else if (e.key === 'Enter') { e.preventDefault(); handleAddSibling(selectedNodeId); } 
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteNode(selectedNodeId); } 
    else if (e.key === ' ' && !e.ctrlKey && !e.metaKey) { setIsPanning(true); } 
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); } 
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); } 
    else if (e.key.length === 1 && /^[a-zA-Z0-9\S]$/.test(e.key)) { e.preventDefault(); startEditing(selectedNodeId); }
  }, [editingNodeId, selectedNodeId, stopEditing, handleAddChild, handleAddSibling, handleDeleteNode, handleUndo, handleRedo, startEditing]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // The rest of the component (rendering logic, etc.) remains the same. The key is the fixed useEffect hook.
  // ... (keep the rest of the file from your previous version, including the return statement)
  // ... (the entire JSX render block)

  const editingNodePosition = useMemo(() => {
    if (!editingNodeId || !doc) return null;
    const node = doc.content.nodes[editingNodeId];
    if (!node) return null;
    
    const stage = stageRef.current;
    if (!stage) return null;

    const { w, h } = getNodeBox(node.text);
    const stageRect = stage.container().getBoundingClientRect();
    const absPos = stage.getAbsoluteTransform().point({ x: node.x, y: node.y });

    return {
      left: stageRect.left + absPos.x - w / 2,
      top: stageRect.top + absPos.y - h / 2,
      width: w,
      height: h,
    };
  }, [editingNodeId, doc, scale, pos, getNodeBox]);

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') setIsPanning(false);
  };
  
  useEffect(() => {
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: (stage.getPointerPosition().x - stage.x()) / oldScale,
      y: (stage.getPointerPosition().y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    setPos({
      x: stage.getPointerPosition().x - mousePointTo.x * newScale,
      y: stage.getPointerPosition().y - mousePointTo.y * newScale,
    });
  };

  if (!doc) {
    return <div className="w-screen h-screen bg-gray-950 flex items-center justify-center text-white"><Spinner />Loading...</div>;
  }
 
  return (
    <div className="w-screen h-screen bg-gray-900 dark:bg-gray-950 overflow-hidden">
        <EditorToolbar
            name={name}
            onNameChange={setName}
            onCommitName={() => updateNameAndPersist(name)}
            onDashboard={() => navigate("/dashboard")}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onShare={() => {
              navigator.clipboard.writeText(window.location.href);
              addToast("Đã sao chép link chia sẻ!", "success");
            }}
            onTheme={toggleTheme}
            onSave={() => addToast("Chức năng đang phát triển")}
            onSavePdf={() => addToast("Chức năng đang phát triển")}
        />
        <Sidebar />
        
        {editingNodeId && editingNodePosition && (
            <textarea
                ref={editingInputRef}
                defaultValue={doc.content.nodes[editingNodeId]?.text}
                onBlur={() => stopEditing(true)}
                style={{
                    position: 'absolute',
                    ...editingNodePosition,
                }}
                className="absolute z-50 bg-white text-black rounded-md shadow px-3 py-2 outline-none resize-none ring-2 ring-blue-500/70"
            />
        )}
        
        <div className="w-full h-full pt-14">
            <Stage
                ref={stageRef}
                width={window.innerWidth}
                height={window.innerHeight - 56}
                scaleX={scale}
                scaleY={scale}
                x={pos.x}
                y={pos.y}
                onWheel={handleWheel}
                onMouseDown={(e) => {
                    if (e.evt.button === 1 || isPanning) { setIsPanning(true); }
                    if (e.target === e.target.getStage()) {
                        setSelectedNodeId("");
                        if(editingNodeId) stopEditing(true);
                    }
                }}
                onMouseUp={() => setIsPanning(false)}
                onMouseMove={(e) => {
                    if (isPanning) {
                        setPos({ x: pos.x + e.evt.movementX, y: pos.y + e.evt.movementY });
                    }
                }}
                style={{ cursor: isPanning ? 'grabbing' : 'default' }}
            >
                <Layer>
                    {Object.values(doc.content.edges).map((edge) => {
                        const from = doc.content.nodes[edge.from];
                        const to = doc.content.nodes[edge.to];
                        if (!from || !to) return null;
                        const points = [from.x, from.y, (from.x + to.x) / 2, from.y, (from.x + to.x) / 2, to.y, to.x, to.y];
                        return <Line key={edge.id} points={points} stroke="#4f4f4f" strokeWidth={2} bezier/>;
                    })}

                    {Object.values(doc.content.nodes).map((node) => {
                        const { w, h } = getNodeBox(node.text);
                        const isSelected = node.id === selectedNodeId;
                        return (
                            <Group
                                key={node.id}
                                x={node.x} y={node.y}
                                draggable
                                onDragEnd={(e) => {
                                  const newNodes = {...doc.content.nodes, [node.id]: {...node, x: e.target.x(), y: e.target.y()}}
                                  updateAndPersist({...doc.content, nodes: newNodes})
                                }}
                                onClick={(e) => {
                                    e.cancelBubble = true;
                                    setSelectedNodeId(node.id);
                                }}
                                onDblClick={(e) => {
                                    e.cancelBubble = true;
                                    startEditing(node.id);
                                }}
                            >
                                <Rect
                                    width={w} height={h}
                                    offsetX={w / 2} offsetY={h / 2}
                                    fill="#1f2937"
                                    cornerRadius={8}
                                    stroke={isSelected ? "#3b82f6" : "#4b5563"}
                                    strokeWidth={isSelected ? 3 : 2}
                                    shadowColor={isSelected ? "#3b82f6" : undefined}
                                    shadowBlur={isSelected ? 8 : 0}
                                    shadowOpacity={0.5}
                                />
                                <Text
                                    text={node.text || '(chưa có nội dung)'}
                                    width={w} height={h}
                                    offsetX={w / 2} offsetY={h / 2}
                                    align="center" verticalAlign="middle"
                                    fill="#d1d5db"
                                    padding={PADDING_Y}
                                    listening={false}
                                />
                            </Group>
                        );
                    })}
                </Layer>
            </Stage>
        </div>
        <DisplaySwitcher onPick={(mode) => console.log("Switching to layout:", mode)} />
    </div>
  );
}