import React, {
  useState,
  useCallback,
  useRef,
  useEffect
} from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider
} from 'reactflow';
import { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import * as d3 from 'd3';

const API_BASE = 'http://localhost:8081/api/mindmaps';
const BRANCH_COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#3b82f6','#84cc16'];
const DOUBLE_ENTER_THRESHOLD = 350;

/* ================== CUSTOM NODE ================== */
const CustomNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [text, setText] = useState(data.label);
  const inputRef = useRef(null);
  const prevEditTokenRef = useRef(data.__editToken);

  useEffect(() => { setText(data.label); }, [data.label]);

  useEffect(() => {
    if (data.__editToken && data.__editToken !== prevEditTokenRef.current) {
      prevEditTokenRef.current = data.__editToken;
      setIsEditing(true);
      data.onEditStart && data.onEditStart();
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
    }
  }, [data.__editToken, data]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      data.onEditStart && data.onEditStart();
    }
  };

  const finishEdit = (save) => {
    if (save && text !== data.label && data.onUpdateLabel) {
      data.onUpdateLabel(data.id, text);
    } else if (!save) {
      setText(data.label);
    }
    setIsEditing(false);
    data.onEditEnd && data.onEditEnd();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finishEdit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.stopPropagation(); }
  };
  const handleBlur = () => finishEdit(true);

  const handleAddChild = (e, side) => {
    e.stopPropagation();
    data.onAddChild && data.onAddChild(data.id, side);
  };

  const side = data.side || 'center';

  const getGradientBackground = (color) => {
    if (data.isRoot) return 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)';
    const v = {
      '#6c63ff': 'linear-gradient(135deg,#6c63ff 0%,#a855f7 100%)',
      '#22c55e': 'linear-gradient(135deg,#22c55e 0%,#84cc16 100%)',
      '#f59e0b': 'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
      '#ef4444': 'linear-gradient(135deg,#ef4444 0%,#f87171 100%)',
      '#a855f7': 'linear-gradient(135deg,#a855f7 0%,#c084fc 100%)',
      '#06b6d4': 'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
      '#3b82f6': 'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)',
      '#84cc16': 'linear-gradient(135deg,#84cc16 0%,#a3e635 100%)'
    };
    return v[color] || 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)';
  };

  const nodeStyle = {
    background: getGradientBackground(data.color),
    border: selected ? '2px solid #667eea' : '2px solid transparent',
    borderRadius: '12px',
    padding: '8px 16px',
    minWidth: '120px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    position: 'relative'
  };

  return (
      <div
          style={nodeStyle}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
      >
        {side === 'left' && (
            <>
              <Handle type="target" position={Position.Right} id={`${data.id}-target-right`} style={{ background:'#fff' }}/>
              <Handle type="source" position={Position.Left} id={`${data.id}-source-left`} style={{ background:'#fff' }}/>
            </>
        )}
        {side === 'right' && (
            <>
              <Handle type="target" position={Position.Left} id={`${data.id}-target-left`} style={{ background:'#fff' }}/>
              <Handle type="source" position={Position.Right} id={`${data.id}-source-right`} style={{ background:'#fff' }}/>
            </>
        )}
        {side === 'center' && (
            <>
              <Handle type="target" position={Position.Left} id={`${data.id}-target-left`} style={{ background:'#fff' }}/>
              <Handle type="source" position={Position.Left} id={`${data.id}-source-left`} style={{ background:'#fff' }}/>
              <Handle type="target" position={Position.Right} id={`${data.id}-target-right`} style={{ background:'#fff' }}/>
              <Handle type="source" position={Position.Right} id={`${data.id}-source-right`} style={{ background:'#fff' }}/>
            </>
        )}

        {isEditing ? (
            <input
                ref={inputRef}
                value={text}
                onChange={(e)=>setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                style={{
                  background:'transparent',
                  border:'none',
                  outline:'none',
                  color:'white',
                  fontSize:'14px',
                  fontWeight:'500',
                  textAlign:'center',
                  width:'100%'
                }}
            />
        ) : (
            <div style={{ color:'white', fontSize:'14px', fontWeight:'500' }}>{text}</div>
        )}

        {!isEditing && hovered && (
            <>
              {!data.isRoot && (
                  <button
                      onClick={(e)=>handleAddChild(e, side === 'left' ? 'left' : 'right')}
                      style={addBtnStyle(side === 'left' ? 'left' : 'right')}
                      title="Thêm node con"
                  >+</button>
              )}
              {data.isRoot && (
                  <>
                    <button
                        onClick={(e)=>handleAddChild(e,'right')}
                        style={addBtnStyle('right')}
                        title="Thêm node con (phải)"
                    >+</button>
                    <button
                        onClick={(e)=>handleAddChild(e,'left')}
                        style={addBtnStyle('left')}
                        title="Thêm node con (trái)"
                    >+</button>
                  </>
              )}
            </>
        )}

        {!data.isRoot && !isEditing && hovered && (
            <button
                onClick={(e)=>{ e.stopPropagation(); data.onDeleteNode && data.onDeleteNode(); }}
                style={deleteBtnStyle}
                title="Xóa node"
            >×</button>
        )}
      </div>
  );
};

const addBtnStyle = (side) => ({
  position:'absolute',
  [side]:'-8px',
  top:'50%',
  transform:'translateY(-50%)',
  width:'20px',
  height:'20px',
  borderRadius:'50%',
  background:'#667eea',
  border:'2px solid white',
  color:'white',
  fontSize:'12px',
  cursor:'pointer',
  display:'flex',
  alignItems:'center',
  justifyContent:'center',
  boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
});

const deleteBtnStyle = {
  position:'absolute',
  top:'-8px',
  right:'-8px',
  width:'20px',
  height:'20px',
  borderRadius:'50%',
  background:'#ef4444',
  border:'2px solid white',
  color:'white',
  fontSize:'13px',
  lineHeight:1,
  cursor:'pointer',
  display:'flex',
  alignItems:'center',
  justifyContent:'center',
  boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
};

const nodeTypes = { custom: CustomNode };

/* ====== AUTO LAYOUT ONLY WHEN NODES OVERLAP ====== */
function shouldAutoLayout(rfNodes) {
  if (rfNodes.length < 2) return false;
  const nearlyZero = rfNodes.every(n => Math.abs(n.position.x) < 1e-3 && Math.abs(n.position.y) < 1e-3);
  if (nearlyZero) return true;
  const freq = {};
  rfNodes.forEach(n => {
    const k = `${Math.round(n.position.x)}:${Math.round(n.position.y)}`;
    freq[k] = (freq[k] || 0) + 1;
  });
  const maxCnt = Math.max(...Object.values(freq));
  return maxCnt / rfNodes.length >= 0.7;
}

/* ====== SUBTREE-AWARE INITIAL LAYOUT (leaf-based) ====== */
function stableInitialLayout(rfNodes, rfEdges) {
  const map = new Map(rfNodes.map(n => [n.id, { ...n, children: [], parent: null, leafCount: 1 }]));
  rfEdges.forEach(e => {
    const p = map.get(e.source);
    const c = map.get(e.target);
    if (p && c) { p.children.push(c); c.parent = p; }
  });
  const root = [...map.values()].find(n => n.data.isRoot);
  if (!root) return rfNodes;

  map.forEach(n => n.children.sort((a,b)=> a.id.localeCompare(b.id)));

  // Leaf count
  const calcLeaves = (node) => {
    if (!node.children.length) { node.leafCount = 1; return 1; }
    let sum = 0;
    node.children.forEach(ch => { sum += calcLeaves(ch); });
    node.leafCount = Math.max(sum, 1);
    return node.leafCount;
  };
  calcLeaves(root);

  const ROOT_X = root.position.x;
  const ROOT_Y = root.position.y;
  const LEVEL_X_ROOT = 260;
  const LEVEL_X_STEP = 180;
  const LEVEL_Y = 140;

  root.data.side = 'center';
  root.position = { x: ROOT_X, y: ROOT_Y };

  const firstChildren = root.children;
  const rightSide = [];
  const leftSide = [];
  firstChildren.forEach((c, i) => (i % 2 === 0 ? rightSide : leftSide).push(c));

  const layoutBranch = (node, side) => {
    if (!node.children.length) return;
    const totalLeaves = node.children.reduce((acc,n)=> acc + n.leafCount, 0);
    let startY = node.position.y - ((totalLeaves - 1) * LEVEL_Y)/2;
    node.children.forEach(ch => {
      const blockHeight = (ch.leafCount - 1) * LEVEL_Y;
      ch.position = {
        x: node.position.x + (side === 'left' ? -LEVEL_X_STEP : LEVEL_X_STEP),
        y: startY + blockHeight/2
      };
      ch.data.side = side;
      layoutBranch(ch, side);
      startY += ch.leafCount * LEVEL_Y;
    });
  };

  const layoutSideGroup = (arr, isRight) => {
    if (!arr.length) return;
    const totalLeaves = arr.reduce((acc,n)=> acc + n.leafCount, 0);
    let startY = ROOT_Y - ((totalLeaves - 1) * LEVEL_Y)/2;
    arr.forEach(ch => {
      const blockHeight = (ch.leafCount - 1) * LEVEL_Y;
      ch.position = {
        x: ROOT_X + (isRight ? LEVEL_X_ROOT : -LEVEL_X_ROOT),
        y: startY + blockHeight/2
      };
      ch.data.side = isRight ? 'right' : 'left';
      layoutBranch(ch, ch.data.side);
      startY += ch.leafCount * LEVEL_Y;
    });
  };

  layoutSideGroup(rightSide, true);
  layoutSideGroup(leftSide, false);

  return rfNodes.map(n => map.get(n.id));
}

/* ================== EDITOR ================== */
const MindmapEditor = ({ mindmapId, isLoggedIn, onRequireLogin }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rootNodeId, setRootNodeId] = useState(null);
  const [loading, setLoading] = useState(false);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const tokenRef = useRef(null);
  const editingRef = useRef(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const lastDeleteRef = useRef(0);
  const lastEnterTimeRef = useRef(0);
  const lastEnterNodeRef = useRef(null);
  const debounceTimers = useRef(new Map());
  const updateLayoutRef = useRef(null);
  const lastClickedNodeRef = useRef(null);

  useEffect(() => {
    tokenRef.current = localStorage.getItem('cognito_token');
  }, []);

  /* ---------- Depth Map ---------- */
  const buildDepthMap = (arr) => {
    const children = new Map();
    arr.forEach(n => {
      if (!children.has(n.parentId)) children.set(n.parentId, []);
      children.get(n.parentId).push(n);
    });
    const root = arr.find(n => n.parentId == null);
    const depthMap = new Map();
    if (!root) return depthMap;
    const q = [{ id: root.id, depth: 0 }];
    while (q.length) {
      const { id, depth } = q.shift();
      depthMap.set(id, depth);
      (children.get(id) || []).forEach(ch => q.push({ id: ch.id, depth: depth + 1 }));
    }
    return depthMap;
  };

  /* ---------- PATCH NODE (debounce) ---------- */
  const patchNode = async (nodeId, payload) => {
    if (!mindmapId) return;
    const token = tokenRef.current;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/${mindmapId}/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) console.error('PATCH node failed', res.status);
    } catch (e) {
      console.error('PATCH error', e);
    }
  };

  const debouncePatch = (nodeId, payload, delay = 500) => {
    if (debounceTimers.current.has(nodeId)) {
      clearTimeout(debounceTimers.current.get(nodeId));
    }
    const t = setTimeout(() => patchNode(nodeId, payload), delay);
    debounceTimers.current.set(nodeId, t);
  };

  const updateNodeLabel = useCallback((nodeId, newLabel) => {
    setNodes(nds =>
        nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n)
    );
    debouncePatch(nodeId, { content: newLabel });
  }, []);

  /* ---------- LEVEL ---------- */
  const getNodeLevel = useCallback((id) => {
    if (!rootNodeId) return 0;
    if (id === rootNodeId) return 0;
    let level = 0;
    let cur = id;
    const visited = new Set();
    while (cur && cur !== rootNodeId) {
      if (visited.has(cur)) break;
      visited.add(cur);
      const parentEdge = edgesRef.current.find(e => e.target === cur);
      if (!parentEdge) break;
      cur = parentEdge.source;
      level++;
    }
    return level;
  }, [rootNodeId]);

  /* ---------- EDGE HANDLE BUILDER (có xử lý riêng cho root) ---------- */
  const buildEdgeHandlesFromSides = useCallback((edgesInput, nodeList) => {
    const byId = new Map(nodeList.map(n => [n.id, n]));
    return edgesInput.map(e => {
      const source = byId.get(e.source);
      const target = byId.get(e.target);
      if (!source || !target) return e;

      const isSourceRoot = source.data?.isRoot;
      const sourceSide = source.data?.side || (source.data?.isRoot ? 'center' : undefined);
      const targetSide = target.data?.side || (target.data?.isRoot ? 'center' : undefined);

      let sourceHandle = e.sourceHandle;
      let targetHandle = e.targetHandle;

      if (isSourceRoot) {
        // Yêu cầu:
        // - Node con bên phải: root source-right -> child target-left
        // - Node con bên trái: root source-left  -> child target-right
        if (targetSide === 'right') {
          sourceHandle = `${source.id}-source-right`;
          targetHandle = `${target.id}-target-left`;
        } else if (targetSide === 'left') {
          sourceHandle = `${source.id}-source-left`;
          targetHandle = `${target.id}-target-right`;
        } else {
          // fallback nếu child center (hiếm)
          sourceHandle = `${source.id}-source-right`;
          targetHandle = `${target.id}-target-left`;
        }
      } else {
        // Giữ logic cũ cho các edge không xuất phát từ root
        if (sourceSide === 'center') {
          sourceHandle = targetSide === 'left'
              ? `${source.id}-source-left`
              : `${source.id}-source-right`;
        } else if (sourceSide === 'left') {
          sourceHandle = `${source.id}-source-left`;
        } else if (sourceSide === 'right') {
          sourceHandle = `${source.id}-source-right`;
        }

        if (targetSide === 'center') {
          const toLeft = target.position.x < source.position.x;
          targetHandle = toLeft
              ? `${target.id}-target-right`
              : `${target.id}-target-left`;
        } else if (targetSide === 'left') {
          targetHandle = `${target.id}-target-right`;
        } else if (targetSide === 'right') {
          targetHandle = `${target.id}-target-left`;
        }
      }

      return {
        ...e,
        sourceHandle,
        targetHandle
      };
    });
  }, []);

  /* ---------- ADD CHILD ---------- */
  const addChildNode = useCallback(async (parentId, preferredSide) => {
    const allNodes = nodesRef.current;
    const allEdges = edgesRef.current;
    const parent = allNodes.find(n => String(n.id) === String(parentId));
    if (!parent) {
      console.log('[ADD CHILD] Parent không tồn tại', parentId);
      return;
    }
    const token = tokenRef.current;
    if (!token) {
      onRequireLogin && onRequireLogin();
      return;
    }

    const siblingsCount = allEdges.filter(e => e.source === parentId).length;
    let childSide = preferredSide || 'right';
    if (parent.data?.side === 'left') childSide = 'left';
    if (parent.data?.side === 'center') {
      childSide = preferredSide || (siblingsCount % 2 === 0 ? 'right' : 'left');
    }

    const level = getNodeLevel(String(parentId)) + 1;
    const color = BRANCH_COLORS[level % BRANCH_COLORS.length];

    const newX = parent.position.x + (childSide === 'left' ? -260 : 260);
    const newY = parent.position.y;

    try {
      const res = await fetch(`${API_BASE}/${mindmapId}/nodes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentId: Number(parentId),
          content: 'New Idea',
          positionX: newX,
          positionY: newY,
          radius: 50
        })
      });
      if (!res.ok) {
        console.error('Create node failed', res.status);
        return;
      }
      const dto = await res.json();
      const newId = String(dto.id);

      const newNode = {
        id: newId,
        type: 'custom',
        position: { x: newX, y: newY },
        data: {
          id: newId,
          label: dto.content,
          isRoot: false,
          side: childSide,
          color,
          onUpdateLabel: updateNodeLabel,
          onAddChild: addChildNode,
          onAddSibling: addSiblingNode,
          onDeleteNode: () => deleteNode(newId),
          onEditStart: () => { editingRef.current = true; },
          onEditEnd: () => { editingRef.current = false; },
          onHoverChange: () => {}
        },
        sourcePosition: childSide === 'left' ? Position.Left : Position.Right,
        targetPosition: childSide === 'left' ? Position.Right : Position.Left
      };

      // Handles cho edge mới
      let sourceHandle;
      let targetHandle;
      if (parent.data?.isRoot) {
        if (childSide === 'right') {
          sourceHandle = `${parent.id}-source-right`;
          targetHandle = `${newId}-target-left`;
        } else {
          sourceHandle = `${parent.id}-source-left`;
          targetHandle = `${newId}-target-right`;
        }
      } else {
        const parentSide = parent.data?.side || (parent.data?.isRoot ? 'center' : undefined);
        if (parentSide === 'center') {
          sourceHandle = childSide === 'left'
              ? `${parent.id}-source-left`
              : `${parent.id}-source-right`;
        } else if (parentSide === 'left') {
          sourceHandle = `${parent.id}-source-left`;
        } else {
          sourceHandle = `${parent.id}-source-right`;
        }
        targetHandle = childSide === 'left'
            ? `${newId}-target-right`
            : `${newId}-target-left`;
      }

      const newEdge = {
        id: `edge-${parentId}-${newId}`,
        source: String(parentId),
        target: newId,
        type: 'straight',
        animated: false,
        style: { stroke: color, strokeWidth: 2 },
        sourceHandle,
        targetHandle
      };

      setNodes(prev => [...prev, newNode]);
      setEdges(prev => [...prev, newEdge]);

      setTimeout(() => {
        updateLayoutRef.current && updateLayoutRef.current();
      }, 60);
    } catch (e) {
      console.error('Add child error', e);
    }
  }, [mindmapId, updateNodeLabel, getNodeLevel]);

  /* ---------- ADD SIBLING ---------- */
  const addSiblingNode = useCallback((nodeId) => {
    const allEdges = edgesRef.current;
    const parentEdge = allEdges.find(e => e.target === nodeId);
    if (!parentEdge) return;
    addChildNode(parentEdge.source);
  }, [addChildNode]);

  /* ---------- DELETE NODE ---------- */
  const deleteNode = useCallback(async (nodeId) => {
    const listNow = nodesRef.current;
    const edgeNow = edgesRef.current;
    const node = listNow.find(n => String(n.id) === String(nodeId));

    if (!node) {
      console.log('[DELETE] Node không tồn tại:', nodeId);
      return;
    }
    if (node.data?.isRoot) {
      console.log('[DELETE] Không thể xóa root', nodeId);
      return;
    }

    const token = tokenRef.current;
    if (!token) {
      onRequireLogin && onRequireLogin();
      return;
    }

    const getAllChildren = (pid) => {
      const direct = edgeNow.filter(e => String(e.source) === String(pid)).map(e => e.target);
      let acc = [...direct];
      direct.forEach(c => { acc = acc.concat(getAllChildren(c)); });
      return acc;
    };
    const children = getAllChildren(nodeId);
    const toRemove = new Set([String(nodeId), ...children.map(String)]);

    const prevNodes = listNow;
    const prevEdges = edgeNow;

    setNodes(prev => prev.filter(n => !toRemove.has(String(n.id))));
    setEdges(prev => prev.filter(e => !toRemove.has(String(e.source)) && !toRemove.has(String(e.target))));

    try {
      const url = `${API_BASE}/${mindmapId}/nodes/${nodeId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[DELETE] Thất bại', res.status, text);
        setNodes(prevNodes);
        setEdges(prevEdges);
        return;
      }
    } catch (err) {
      console.error('[DELETE] Lỗi network', err);
      setNodes(prevNodes);
      setEdges(prevEdges);
    }
  }, [mindmapId]);

  /* ---------- FETCH NODES ---------- */
  const refetchNodes = useCallback(async () => {
    if (!mindmapId) return;
    try {
      setLoading(true);
      const token = tokenRef.current;
      if (!token) {
        onRequireLogin && onRequireLogin();
        return;
      }
      const res = await fetch(`${API_BASE}/${mindmapId}/nodes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('Fetch nodes failed', res.status);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const root = data.find(n => n.parentId == null);
      if (root) setRootNodeId(String(root.id));

      const depthMap = buildDepthMap(data);
      let rfNodes = data.map(n => {
        const depth = depthMap.get(n.id) ?? 0;
        const color = BRANCH_COLORS[depth % BRANCH_COLORS.length];
        const idStr = String(n.id);
        return {
          id: idStr,
          type: 'custom',
          position: { x: n.positionX ?? 0, y: n.positionY ?? 0 },
          data: {
            id: idStr,
            label: n.content,
            isRoot: n.parentId == null,
            side: n.parentId == null ? 'center' : undefined,
            color,
            onUpdateLabel: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: () => deleteNode(idStr),
            onEditStart: () => { editingRef.current = true; },
            onEditEnd: () => { editingRef.current = false; },
            onHoverChange: () => {}
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left
        };
      });

      let rfEdges = data
          .filter(n => n.parentId != null)
          .map(n => ({
            id: `edge-${n.parentId}-${n.id}`,
            source: String(n.parentId),
            target: String(n.id),
            type: 'straight',
            animated: false,
            style: { stroke: '#6c63ff', strokeWidth: 2 }
          }));

      if (shouldAutoLayout(rfNodes)) {
        rfNodes = stableInitialLayout(rfNodes, rfEdges);
      }

      rfNodes = rfNodes.map(node => {
        const side = node.data.side || (node.data.isRoot ? 'center' : undefined);
        let sourcePosition = node.sourcePosition;
        let targetPosition = node.targetPosition;
        if (side === 'left') {
          sourcePosition = Position.Left;
          targetPosition = Position.Right;
        } else if (side === 'right') {
          sourcePosition = Position.Right;
          targetPosition = Position.Left;
        } else if (side === 'center') {
          sourcePosition = Position.Right;
          targetPosition = Position.Left;
        }
        return { ...node, sourcePosition, targetPosition };
      });

      rfEdges = buildEdgeHandlesFromSides(rfEdges, rfNodes);

      setNodes(rfNodes);
      setEdges(rfEdges);

      setTimeout(() => {
        updateLayoutRef.current && updateLayoutRef.current();
        setEdges(prev => buildEdgeHandlesFromSides(prev, nodesRef.current));
      }, 80);

    } catch (e) {
      console.error('Fetch nodes error', e);
    } finally {
      setLoading(false);
    }
  }, [mindmapId, addChildNode, addSiblingNode, deleteNode, updateNodeLabel, onRequireLogin, buildEdgeHandlesFromSides]);

  useEffect(() => { refetchNodes(); }, [refetchNodes]);

  /* ---------- UPDATE LAYOUT ---------- */
  const updateLayout = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    if (!currentNodes.length) return;

    // Build adjacency map
    const nodeMap = new Map();
    currentNodes.forEach(n => {
      nodeMap.set(n.id, {
        id: n.id,
        originalNode: n,
        children: [],
        parent: null,
        data: { originalNode: n }
      });
    });
    currentEdges.forEach(e => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (s && t) {
        s.children.push(t);
        t.parent = s;
      }
    });

    // Roots
    const roots = [];
    nodeMap.forEach(n => { if (!n.parent) roots.push(n); });

    const updatedNodesMap = new Map(currentNodes.map(n => [n.id, { ...n }]));

    const layoutMindmap = (rootObj) => {
      const h = d3.hierarchy(rootObj, d => d.children);

      const LEVEL_Y = 140;
      const SIDE_SPACING = 300;
      const NODE_SPACING = 180;
      const ROOT_X = 400;
      const ROOT_Y = 300;

      const calcLeaves = (node) => {
        if (!node.children || !node.children.length) {
          node.data.leafCount = 1;
          return 1;
        }
        let sum = 0;
        node.children.forEach(ch => { sum += calcLeaves(ch); });
        node.data.leafCount = Math.max(sum, 1);
        return node.data.leafCount;
      };
      calcLeaves(h);

      h.x = ROOT_X;
      h.y = ROOT_Y;
      h.data.side = 'center';

      const children = h.children || [];
      const rightGroup = [];
      const leftGroup = [];
      children.forEach((c,i)=> (i % 2 === 0 ? rightGroup : leftGroup).push(c));

      const placeGroup = (arr, isRight) => {
        if (!arr.length) return;
        const totalLeaves = arr.reduce((a,n)=> a + (n.data.leafCount||1), 0);
        let startY = ROOT_Y - ((totalLeaves - 1) * LEVEL_Y)/2;
        arr.forEach(ch => {
          const blockHeight = (ch.data.leafCount - 1) * LEVEL_Y;
          ch.x = ROOT_X + (isRight ? SIDE_SPACING : -SIDE_SPACING);
          ch.y = startY + blockHeight/2;
          ch.data.side = isRight ? 'right' : 'left';
          layoutBranch(ch, ch.data.side);
          startY += ch.data.leafCount * LEVEL_Y;
        });
      };

      const layoutBranch = (node, side) => {
        if (!node.children || !node.children.length) return;
        const kids = node.children;
        const totalLeaves = kids.reduce((a,n)=> a + (n.data.leafCount||1), 0);
        let startY = node.y - ((totalLeaves -1) * LEVEL_Y)/2;
        kids.forEach(k => {
          const blockHeight = (k.data.leafCount - 1) * LEVEL_Y;
          k.x = node.x + (side === 'left' ? -NODE_SPACING : NODE_SPACING);
          k.y = startY + blockHeight/2;
          k.data.side = side;
          layoutBranch(k, side);
          startY += k.data.leafCount * LEVEL_Y;
        });
      };

      placeGroup(rightGroup, true);
      placeGroup(leftGroup, false);

      h.descendants().forEach(d => {
        if (d.data && d.data.originalNode) {
          const orig = d.data.originalNode;
          const side = d.data.side ||
              (d.x < h.x ? 'left' : d.x > h.x ? 'right' : 'center');
          const newNode = {
            ...orig,
            position: { x: d.x, y: d.y },
            data: {
              ...orig.data,
              side
            },
            sourcePosition:
                side === 'left'
                    ? Position.Left
                    : side === 'right'
                        ? Position.Right
                        : Position.Right,
            targetPosition:
                side === 'left'
                    ? Position.Right
                    : side === 'right'
                        ? Position.Left
                        : Position.Left
          };
          updatedNodesMap.set(newNode.id, newNode);
        }
      });
    };

    roots.forEach(r => layoutMindmap(r));

    const newNodesArr = Array.from(updatedNodesMap.values());
    setNodes(newNodesArr);
    setEdges(prev => buildEdgeHandlesFromSides(prev, newNodesArr));
  }, [buildEdgeHandlesFromSides]);

  updateLayoutRef.current = updateLayout;

  /* ---------- MOUSE TRACK ---------- */
  useEffect(() => {
    const mm = (e) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', mm);
    return () => document.removeEventListener('mousemove', mm);
  }, []);

  /* ---------- NODE CLICK ---------- */
  const handleNodeClick = useCallback((_, node) => {
    lastClickedNodeRef.current = node.id;
  }, []);

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  useEffect(() => {
    const keyHandler = (e) => {
      if (editingRef.current) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      const listNow = nodesRef.current;
      const selectedNode = listNow.find(n => n.selected) ||
          listNow.find(n => n.id === lastClickedNodeRef.current);

      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedNode) addChildNode(selectedNode.id);
        return;
      }

      if (e.key === 'Enter') {
        if (!selectedNode) return;
        const now = Date.now();
        const sameNode = lastEnterNodeRef.current === selectedNode.id;
        const within = now - lastEnterTimeRef.current <= DOUBLE_ENTER_THRESHOLD;
        if (sameNode && within) {
          setNodes(prev =>
              prev.map(n =>
                  n.id === selectedNode.id
                      ? { ...n, data: { ...n.data, __editToken: Date.now() } }
                      : n
              )
          );
          lastEnterTimeRef.current = 0;
          lastEnterNodeRef.current = null;
        } else {
          if (!selectedNode.data?.isRoot) addSiblingNode(selectedNode.id);
          lastEnterTimeRef.current = now;
          lastEnterNodeRef.current = selectedNode.id;
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastDeleteRef.current < 120) return;
        lastDeleteRef.current = now;

        let targetId = selectedNode && !selectedNode.data?.isRoot
            ? selectedNode.id
            : null;

        if (!targetId) {
          const el = document.elementFromPoint(mousePositionRef.current.x, mousePositionRef.current.y);
          const nodeEl = el?.closest('.react-flow__node');
          if (nodeEl) {
            const nid = nodeEl.getAttribute('data-id');
            const nd = listNow.find(n => n.id === nid);
            if (nd && !nd.data?.isRoot) {
              targetId = nd.id;
            }
          }
        }
        if (targetId) deleteNode(targetId);
      }
    };
    document.addEventListener('keydown', keyHandler, { capture: true });
    return () => document.removeEventListener('keydown', keyHandler, { capture: true });
  }, [addChildNode, addSiblingNode, deleteNode, setNodes]);

  /* ---------- CONNECT EDGE (đảm bảo edge từ root theo quy tắc mới) ---------- */
  const onConnect = useCallback((params) => {
    if (!params || !params.source || !params.target || params.source === params.target) return;
    setEdges(eds => {
      const duplicate = eds.some(e => e.source === params.source && e.target === params.target);
      if (duplicate) return eds;
      const sourceNode = nodesRef.current.find(n => n.id === params.source);
      const targetNode = nodesRef.current.find(n => n.id === params.target);
      const color = sourceNode?.data?.color || '#6c63ff';

      let styled = {
        ...params,
        type: 'straight',
        animated: false,
        style: { strokeWidth: 2, stroke: color }
      };

      if (sourceNode?.data?.isRoot && targetNode) {
        // Áp dụng quy tắc root
        if (targetNode.data?.side === 'right') {
          styled.sourceHandle = `${sourceNode.id}-source-right`;
          styled.targetHandle = `${targetNode.id}-target-left`;
        } else if (targetNode.data?.side === 'left') {
          styled.sourceHandle = `${sourceNode.id}-source-left`;
          styled.targetHandle = `${targetNode.id}-target-right`;
        } else {
          styled.sourceHandle = `${sourceNode.id}-source-right`;
          styled.targetHandle = `${targetNode.id}-target-left`;
        }
      } else {
        // Logic cũ
        if (sourceNode) {
          const sSide = sourceNode.data?.side || (sourceNode.data?.isRoot ? 'center' : undefined);
          if (sSide === 'center') {
            const toLeft =
                targetNode?.data?.side === 'left' ||
                (targetNode && targetNode.position.x < sourceNode.position.x);
            styled.sourceHandle = toLeft
                ? `${params.source}-source-left`
                : `${params.source}-source-right`;
          } else if (sSide === 'left') {
            styled.sourceHandle = `${params.source}-source-left`;
          } else if (sSide === 'right') {
            styled.sourceHandle = `${params.source}-source-right`;
          }
        }

        if (targetNode) {
          const tSide = targetNode.data?.side || (targetNode.data?.isRoot ? 'center' : undefined);
          if (tSide === 'left') {
            styled.targetHandle = `${params.target}-target-right`;
          } else if (tSide === 'right') {
            styled.targetHandle = `${params.target}-target-left`;
          } else {
            if (sourceNode) {
              const toLeft = targetNode.position.x < sourceNode.position.x;
              styled.targetHandle = toLeft
                  ? `${params.target}-target-right`
                  : `${params.target}-target-left`;
            }
          }
        }
      }
      return addEdge(styled, eds);
    });
  }, [setEdges]);

  return (
      <div style={{ width:'100%', height:'100%', position:'relative' }}>
        <style>{`.react-flow__attribution{display:none!important}`}</style>

        {loading && (
            <div style={{
              position:'absolute',
              inset:0,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              background:'rgba(0,0,0,0.25)',
              zIndex:10,
              color:'#fff',
              fontWeight:500
            }}>Đang tải...</div>
        )}

        {!isLoggedIn && (
            <div style={{
              position:'absolute',
              top:16,
              right:16,
              display:'flex',
              gap:12,
              zIndex:15
            }}>
              <button
                  onClick={() => onRequireLogin && onRequireLogin()}
                  style={miniBtnStyle('#10b981', '#059669')}
              >Đăng nhập</button>
              <button
                  onClick={() => onRequireLogin && onRequireLogin()}
                  style={miniBtnStyle('#667eea', '#764ba2')}
              >Lưu Mindmap</button>
            </div>
        )}

        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onConnect={onConnect}
            fitView
            defaultEdgeOptions={{
              type: 'straight',
              animated: false,
              style: { strokeWidth: 2, stroke: '#6c63ff' }
            }}
        >
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
  );
};

/* ================== STYLES ================== */
const miniBtnStyle = (c1, c2) => ({
  background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
});

/* ================== WRAPPER ================== */
const MindmapEditorWrapper = ({ mindmapId, isLoggedIn, onRequireLogin }) => {
  return (
      <ReactFlowProvider>
        <MindmapEditor
            mindmapId={mindmapId}
            isLoggedIn={isLoggedIn}
            onRequireLogin={onRequireLogin}
        />
      </ReactFlowProvider>
  );
};

export default MindmapEditorWrapper;