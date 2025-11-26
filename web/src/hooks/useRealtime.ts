import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { EdgeData, useEditorStore } from '../app/store/useEditorStore';
import { throttle } from 'lodash'; // Nếu đã cài lodash, có thể dùng lodash.throttle thay cho throttleFunc để mượt hơn

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
  // [MỚI] Thông tin người dùng hiện tại để gửi Presence (tên và màu)
  userInfo: { name: string; color: string };
  onLayoutRequest: (keepCamera: boolean) => void;
  onSetRootCollapse: (side: 'left' | 'right', collapsed: boolean) => void;
};

// Helper throttle (thay thế cho lodash.throttle nếu chưa cài lodash)
// Giới hạn tần suất gọi hàm để tránh spam WebSocket
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
  userInfo, // [MỚI] Prop mới để gửi thông tin user khi join
  onLayoutRequest,
  onSetRootCollapse,
}: UseRealtimeProps) {
  const { getAccessToken, isAuthed, user } = useAuth();
  const { addToast } = useToast();
  const { setGraph, setPeerInfo, updatePeerCursor, removePeer } = useEditorStore(); // [MỚI] Sử dụng actions tối ưu cho peers (set info, update cursor riêng)

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Dùng ref để lưu props mới nhất, tránh re-connect liên tục do dependency changes
  const latestProps = useRef({ isOwner, userInfo, onLayoutRequest, onSetRootCollapse });
  useEffect(() => {
    latestProps.current = { isOwner, userInfo, onLayoutRequest, onSetRootCollapse };
  }, [isOwner, userInfo, onLayoutRequest, onSetRootCollapse]);

  // 1. Hàm gửi Patch (cho các thao tác Node/Graph)
  const sendPatch = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type, payload }));
      } catch (e) {
        console.error('Lỗi khi gửi WebSocket patch:', e);
      }
    }
  }, []);

  // 2. [MỚI] Hàm gửi Presence (Tên & Màu) - Chỉ gửi 1 lần khi join hoặc reconnect
  // Giúp người khác biết tên và màu của mình mà không cần gửi lặp lại trong cursor move
  const sendPresence = useCallback(() => {
    const { name, color } = latestProps.current.userInfo;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'USER_PRESENCE',
        payload: { name, color }
      }));
    }
  }, []);

  // 3. [MỚI] Hàm gửi vị trí chuột (Payload gọn nhẹ chỉ x, y)
  // Throttle 50ms = 20 updates/giây (Đủ mượt mà không spam server)
  const sendCursor = useRef(
    throttleFunc((x: number, y: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'CURSOR_MOVE',
          payload: { x, y } // Payload tối ưu, không gửi name/color lặp lại
        }));
      }
    }, 50)
  ).current;

  useEffect(() => {
    if (!mindmapId || !isAuthed || isGuest || !isDataLoaded) {
      return;
    }

    let isMounted = true;
    let retryCount = 0;

    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !isMounted) return;

        const wsUrl = `ws://localhost:8081/ws/mindmap/${mindmapId}?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`🟢 WebSocket connected: ${mindmapId}`);
          setIsConnected(true);
          retryCount = 0;
          // [MỚI] Gửi thông tin Presence ngay khi kết nối (tên và màu)
          sendPresence();
        };

        ws.onmessage = (event) => {
          try {
            const message: BroadcastPatch = JSON.parse(event.data);
            const { type, payload, senderId } = message;

            // Lấy props mới nhất từ ref để tránh stale closures
            const { isOwner: currentIsOwner, onLayoutRequest: currentLayoutRequest, onSetRootCollapse: currentSetRootCollapse, userInfo: currentUserInfo } = latestProps.current;

            // Bỏ qua message từ chính mình
            if (user?.sub === senderId || user?.id === senderId) return;

            // Lấy state hiện tại từ store
            const { nodes: currentNodes, edges: currentEdges } = useEditorStore.getState();

            switch (type) {
              case 'USER_JOINED':
                addToast(`User ${payload.userId.substring(0, 6)}... đã tham gia.`, 'info');
                // Nếu mình là Owner, gửi full snapshot dữ liệu
                if (currentIsOwner) {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'FULL_SYNC',
                      payload: { nodes: currentNodes, edges: currentEdges }
                    }));
                  }
                }
                // [MỚI] Gửi lại Presence của mình để người mới biết (tránh thiếu info)
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'USER_PRESENCE',
                    payload: currentUserInfo
                  }));
                }
                break;

              // [MỚI] Nhận Presence từ người khác (tên và màu)
              case 'USER_PRESENCE':
                setPeerInfo(senderId, { name: payload.name, color: payload.color });
                break;

              // [MỚI] Nhận tọa độ chuột (chỉ update x/y, giữ nguyên name/color)
              case 'CURSOR_MOVE':
                updatePeerCursor(senderId, payload.x, payload.y);
                break;

              case 'USER_LEFT':
                removePeer(senderId);
                addToast(`User... đã rời đi.`, 'info');
                break;

              case 'FULL_SYNC':
                console.log("🔄 Received FULL_SYNC snapshot. Updating store...");
                setGraph(payload.nodes, payload.edges);
                setTimeout(() => currentLayoutRequest(true), 50);
                addToast('Đã đồng bộ dữ liệu mới nhất.', 'success');
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
                // [FIX LỖI] Chỉ thêm edge nếu tồn tại (không null)
                const nextEdges = feEdge ? [...currentEdges, feEdge] : currentEdges;
                setGraph([...currentNodes, feNode], nextEdges);
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
            // Exponential backoff cho reconnect (tối đa 10s)
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
  }, [mindmapId, isAuthed, isGuest, isDataLoaded, getAccessToken, addToast, setGraph, setPeerInfo, updatePeerCursor, removePeer, sendPresence]);

  return { sendPatch, sendCursor, isConnected };
}