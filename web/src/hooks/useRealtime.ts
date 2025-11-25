import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { EdgeData, useEditorStore } from '../app/store/useEditorStore';
import { throttle } from 'lodash';

type BroadcastPatch = {
  type: string;
  payload: any;
  senderId: string;
};

type UseRealtimeProps = {
  mindmapId?: string;
  isGuest: boolean;
  isDataLoaded: boolean;
  isOwner: boolean;
  onLayoutRequest: (keepCamera: boolean) => void;
  onSetRootCollapse: (side: 'left' | 'right', collapsed: boolean) => void;
};

// Helper throttle
const throttleFunc = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

export function useRealtime({
  mindmapId,
  isGuest,
  isDataLoaded,
  isOwner,
  onLayoutRequest,
  onSetRootCollapse,
}: UseRealtimeProps) {
  const { getAccessToken, isAuthed, user } = useAuth();
  const { addToast } = useToast();
  const { setGraph, updatePeer, removePeer } = useEditorStore();
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // [FIX QUAN TRỌNG]: Dùng useRef để lưu trữ giá trị mới nhất của các biến/hàm
  // giúp useEffect kết nối KHÔNG bị chạy lại khi các biến này thay đổi.
  const latestProps = useRef({ isOwner, user, onLayoutRequest, onSetRootCollapse });

  // Cập nhật ref mỗi khi props thay đổi
  useEffect(() => {
    latestProps.current = { isOwner, user, onLayoutRequest, onSetRootCollapse };
  }, [isOwner, user, onLayoutRequest, onSetRootCollapse]);
  
  const sendPatch = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type, payload }));
      } catch (e) {
        console.error('Lỗi khi gửi WebSocket patch:', e);
      }
    }
  }, []);

  const sendCursor = useRef(
    throttleFunc((x: number, y: number, name: string, color: string) => {
       if (wsRef.current?.readyState === WebSocket.OPEN) {
         wsRef.current.send(JSON.stringify({ 
             type: 'CURSOR_MOVE', 
             payload: { x, y, name, color } 
         }));
       }
    }, 50)
  ).current;

  useEffect(() => {
    // Chỉ kết nối khi đủ điều kiện
    if (!mindmapId || !isAuthed || isGuest || !isDataLoaded) {
      return;
    }

    let isMounted = true;
    let retryCount = 0;

    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !isMounted) return;

        // URL WebSocket
        const wsUrl = `ws://localhost:8081/ws/mindmap/${mindmapId}?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`🟢 WebSocket connected: ${mindmapId}`);
            setIsConnected(true);
            retryCount = 0; 
        };
        
        ws.onmessage = (event) => {
          try {
            const message: BroadcastPatch = JSON.parse(event.data);
            const { type, payload, senderId } = message;

            // Lấy giá trị mới nhất từ Ref (không gây re-render/re-connect)
            const { user: currentUser, isOwner: currentIsOwner, onLayoutRequest: currentLayoutRequest, onSetRootCollapse: currentSetRootCollapse } = latestProps.current;

            // Check sender
            if (currentUser?.sub === senderId || currentUser?.id === senderId) return;

            // Lấy state store mới nhất
            const { nodes: currentNodes, edges: currentEdges } = useEditorStore.getState();

            switch (type) {
              case 'USER_JOINED':
                addToast(`User ${payload.userId.substring(0, 6)}... đã tham gia.`, 'info');
                if (currentIsOwner) {
                    console.log("👑 Sending Snapshot...");
                    // Gửi snapshot thủ công qua socket instance hiện tại để đảm bảo
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ 
                            type: 'FULL_SYNC', 
                            payload: { nodes: currentNodes, edges: currentEdges } 
                        }));
                    }
                }
                break;

              case 'FULL_SYNC': 
                console.log("🔄 Syncing data...");
                setGraph(payload.nodes, payload.edges);
                setTimeout(() => currentLayoutRequest(true), 50);
                addToast('Đồng bộ dữ liệu thành công.', 'success');
                break;

              case 'USER_LEFT':
                removePeer(senderId);
                break;

              case 'CURSOR_MOVE':
                  updatePeer(senderId, { 
                      x: payload.x, y: payload.y, 
                      name: payload.name, color: payload.color 
                  });
                  break;
              
              case 'NODE_MOVE': {
                const { id: nodeId, x, y } = payload;
                const newNodes = currentNodes.map((n) =>
                   n.id === nodeId ? { ...n, x, y } : n
                );
                setGraph(newNodes, currentEdges);
                break;
              }

              case 'NODE_TEXT_CHANGE': {
                const { id: nodeId, text } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, nodeText: text } : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_CREATE': {
                const { node: feNode, edge: feEdge } = payload;
                setGraph([...currentNodes, feNode], [...currentEdges, feEdge]);
                setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_DELETE': {
                const { nodeIds } = payload;
                const set = new Set(nodeIds as string[]);
                const newNodes = currentNodes.filter((n) => !set.has(n.id));
                const newEdges = currentEdges.filter(
                  (e) => !set.has(e.from) && !set.has(e.to)
                );
                setGraph(newNodes, newEdges);
                setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_REPARENT': {
                const { nodeId, newParentId, x, y, side } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId
                    ? { ...n, parentId: newParentId, x, y, side }
                    : n
                );
                const oldEdge = currentEdges.find((e) => e.to === nodeId);
                let newEdges: EdgeData[];
                if (oldEdge) {
                  newEdges = currentEdges.map((e) =>
                    e.id === oldEdge.id ? { ...e, from: newParentId } : e
                  );
                } else {
                  newEdges = [
                    ...currentEdges,
                    { id: `e-${nodeId}`, from: newParentId, to: nodeId },
                  ];
                }
                setGraph(newNodes, newEdges);
                setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_STYLE_UPDATE': {
                const { id: nodeId, updates } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...updates } : n
                );
                setGraph(newNodes, currentEdges);
                if (updates.nodeLength) setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_QUICK_STYLE_APPLY': {
               const { id: nodeId, styleId, resetStyle } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId
                    ? { ...n, ...resetStyle, quickStyleId: styleId }
                    : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_STYLE_PASTE': {
               const { id: nodeId, style } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...style } : n
                );
                setGraph(newNodes, currentEdges);
               setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_STYLE_RESET': {
                const { id: nodeId, resetStyle } = payload;
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, ...resetStyle } : n
                );
                setGraph(newNodes, currentEdges);
                setTimeout(() => currentLayoutRequest(true), 0);
                break;
              }

              case 'NODE_TOGGLE_COLLAPSE': {
                const { id: nodeId } = payload;
                const newNodes = currentNodes.map(n => 
                  n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
                );
                setGraph(newNodes, currentEdges);
               break;
              }

              case 'ROOT_TOGGLE_COLLAPSE': {
                const { side } = payload;
                if (side === 'left' || side === 'right') {
                    currentSetRootCollapse(side, true); 
                }
                break;
              }
              
              case 'LINE_COLOR_TOGGLE': {
                  useEditorStore.setState({ isColoredBranch: payload.state });
                  setGraph([...currentNodes], currentEdges);
                  break;
              }

              case 'BACKGROUND_CHANGE': {
                  useEditorStore.setState({ backgroundColor: payload.color });
                  break;
              }

              case 'GLOBAL_BRANCH_COLOR_CHANGE': {
                  useEditorStore.setState({ globalBranchColor: payload.color });
                  setGraph([...currentNodes], currentEdges);
                  break;
              }

              case 'MAP_NAME_CHANGE': {
                  useEditorStore.setState({ currentMindmapName: payload.name });
                  break;
              }

              default:
                break;
            }
          } catch (e) {
            console.error('WS Message Error:', e);
          }
        };
        
        ws.onclose = () => {
          console.log(`🔴 WS Disconnected`);
          wsRef.current = null;
          setIsConnected(false);

          if (isMounted) {
             // Reconnect logic
             const timeout = Math.min(1000 * (2 ** retryCount), 10000);
             retryCount++;
             reconnectTimeoutRef.current = setTimeout(connect, timeout);
          }
        };
      } catch (err) {
        console.error("WS Connect Error", err);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // [QUAN TRỌNG] Dependency array chỉ chứa các biến tĩnh hoặc ít thay đổi
    // Loại bỏ onLayoutRequest, onSetRootCollapse, isOwner, user khỏi đây
  }, [mindmapId, isAuthed, isGuest, isDataLoaded, getAccessToken, addToast, setGraph, updatePeer, removePeer]); 

  return { sendPatch, sendCursor, isConnected };
}