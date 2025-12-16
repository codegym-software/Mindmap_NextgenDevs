import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { EdgeData, useEditorStore } from '../app/store/useEditorStore';

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
  userInfo: { name: string; color: string };
  onLayoutRequest: (keepCamera: boolean) => void;
  onSetRootCollapse: (side: 'left' | 'right', collapsed: boolean) => void;
  shouldConnect: boolean;
};

// Helper throttle để giảm tải việc gửi cursor liên tục
const throttleFunc = (func: Function, limit: number) => {
  let inThrottle = false;
  return function (this: any, ...args: any[]) {
    if (inThrottle) return;
    func.apply(this, args);
    inThrottle = true;
    setTimeout(() => (inThrottle = false), limit);
  };
};

const getMySenderId = (user: any) => user?.sub || user?.id || user?.uid;

export function useRealtime({
  mindmapId,
  isGuest,
  isDataLoaded,
  isOwner,
  userInfo,
  onLayoutRequest,
  onSetRootCollapse,
  shouldConnect,
}: UseRealtimeProps) {
  const { getAccessToken, isAuthed, user } = useAuth();
  const { addToast } = useToast();

  const { setGraph, setPeerInfo, updatePeerCursor, removePeer } = useEditorStore();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Lưu props mới nhất vào ref để tránh closure cũ trong onmessage
  const latestProps = useRef({
    isOwner,
    userInfo,
    onLayoutRequest,
    onSetRootCollapse,
  });

  useEffect(() => {
    latestProps.current = { isOwner, userInfo, onLayoutRequest, onSetRootCollapse };
  }, [isOwner, userInfo, onLayoutRequest, onSetRootCollapse]);

  // --- Hàm gửi (Senders) ---

  const sendPatch = useCallback((type: string, payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type, payload }));
    } catch (e) {
      console.error('WS sendPatch error:', e);
    }
  }, []);

  const sendPresence = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const { name, color } = latestProps.current.userInfo;

    ws.send(
      JSON.stringify({
        type: 'USER_PRESENCE',
        payload: { name, color },
      }),
    );
  }, []);

  // Tự động gửi lại Presence khi thông tin user thay đổi (đổi tên/màu)
  useEffect(() => {
    if (!isConnected) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    sendPresence();
  }, [userInfo.name, userInfo.color, isConnected, sendPresence]);

  const sendCursor = useRef(
    throttleFunc((x: number, y: number) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'CURSOR_MOVE', payload: { x, y } }));
    }, 50),
  ).current;

  // Helper: Lấy tên user từ Store để hiển thị khi rời đi
  const getPeerName = (senderId: string) => {
    const state: any = useEditorStore.getState();
    // Kiểm tra cấu trúc store của bạn, thường là state.peers[id]
    const peer = state.peers?.[senderId];
    return peer?.name || 'Một người dùng';
  };

  // --- WebSocket Connection Logic ---
  useEffect(() => {
    // Điều kiện kết nối:
    // 1. Có mindmapId
    // 2. Đã login (isAuthed)
    // 3. KHÔNG phải Guest
    // 4. Dữ liệu đã load xong (để tránh sync đè khi chưa có gì)
    // 5. shouldConnect (được phép connect, không bị chặn quyền)
    if (!mindmapId || !isAuthed || isGuest || !isDataLoaded || !shouldConnect) {
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
          // Gửi thông tin mình ngay khi vào để người khác thấy
          sendPresence();
        };

        ws.onmessage = (event) => {
          try {
            const msg: BroadcastPatch = JSON.parse(event.data);
            const { type, payload, senderId } = msg;

            // Bỏ qua tin nhắn từ chính mình
            const myId = getMySenderId(user);
            if (myId && senderId && senderId === myId) return;

            const {
              isOwner: currentIsOwner,
              userInfo: currentUserInfo,
              onSetRootCollapse: currentSetRootCollapse,
            } = latestProps.current;

            const { nodes: currentNodes, edges: currentEdges } = useEditorStore.getState();

            switch (type) {
              case 'USER_JOINED': {
                // User mới vào chưa gửi Presence, nên chưa biết tên -> Không Toast.
                
                // Nếu mình là Owner -> Gửi FULL SNAPSHOT cho người mới
                if (currentIsOwner && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'FULL_SYNC',
                      payload: { nodes: currentNodes, edges: currentEdges },
                    }),
                  );
                }
                
                // Gửi lại Presence của mình để người mới cập nhật danh sách user
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'USER_PRESENCE',
                      payload: currentUserInfo,
                    }),
                  );
                }
                break;
              }

              case 'USER_PRESENCE': {
                const name = payload?.name || 'User';
                const color = payload?.color || '#999999';

                // Kiểm tra xem user này đã có trong store chưa
                const state: any = useEditorStore.getState();
                const isNewPeer = !state.peers?.[senderId];

                // Cập nhật thông tin peer
                setPeerInfo(senderId, { name, color });

                // Chỉ hiện Toast nếu đây là user mới (tránh spam khi họ update màu/tên)
                if (isNewPeer) {
                    addToast(`${name} đã tham gia chỉnh sửa.`, 'info');
                }
                break;
              }

              case 'CURSOR_MOVE': {
                updatePeerCursor(senderId, payload?.x, payload?.y);
                break;
              }

              case 'USER_LEFT': {
                const name = getPeerName(senderId);
                removePeer(senderId);
                addToast(`${name} đã rời đi.`, 'info');
                break;
              }

              case 'FULL_SYNC': {
                console.log('🔄 Received FULL_SYNC snapshot.');
                if (payload?.nodes && payload?.edges) {
                  // ✅ FIX QUAN TRỌNG: Chỉ setGraph, KHÔNG gọi handleLayout
                  // Layout tự động sẽ phá vỡ vị trí do Owner gửi xuống
                  setGraph(payload.nodes, payload.edges);
                  
                  addToast('Đã đồng bộ dữ liệu mới nhất.', 'success');
                }
                break;
              }

              // --- Các case xử lý thao tác ---
              
              case 'NODE_MOVE': {
                const { id: nodeId, x, y } = payload || {};
                const newNodes = currentNodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n));
                setGraph(newNodes, currentEdges);
                break;
              }

              case 'NODE_TEXT_CHANGE': {
                const { id: nodeId, text } = payload || {};
                const newNodes = currentNodes.map((n) => (n.id === nodeId ? { ...n, nodeText: text } : n));
                setGraph(newNodes, currentEdges);
                break;
              }

              case 'NODE_CREATE': {
                const { node: feNode, edge: feEdge } = payload || {};
                if (!feNode) break;
                const nextEdges = feEdge ? [...currentEdges, feEdge] : currentEdges;
                setGraph([...currentNodes, feNode], nextEdges);
                break;
              }

              case 'NODE_DELETE': {
                const { nodeIds } = payload || {};
                const set = new Set((nodeIds || []) as string[]);
                const newNodes = currentNodes.filter((n) => !set.has(n.id));
                const newEdges = currentEdges.filter((e) => !set.has(e.from) && !set.has(e.to));
                setGraph(newNodes, newEdges);
                break;
              }

              case 'NODE_REPARENT': {
                const { nodeId, newParentId, x, y, side } = payload || {};
                const newNodes = currentNodes.map((n) =>
                  n.id === nodeId ? { ...n, parentId: newParentId, x, y, side } : n,
                );
                const oldEdge = currentEdges.find((e) => e.to === nodeId);
                let newEdges: EdgeData[];
                if (oldEdge) {
                  newEdges = currentEdges.map((e) => (e.id === oldEdge.id ? { ...e, from: newParentId } : e));
                } else {
                  newEdges = [...currentEdges, { id: `e-${nodeId}`, from: newParentId, to: nodeId }];
                }
                setGraph(newNodes, newEdges);
                break;
              }

              case 'NODE_STYLE_UPDATE': {
                const { id: nodeId, updates } = payload || {};
                const newNodes = currentNodes.map((n) => (n.id === nodeId ? { ...n, ...(updates || {}) } : n));
                setGraph(newNodes, currentEdges);
                break;
              }

              case 'ROOT_TOGGLE_COLLAPSE': {
                const { side } = payload;
                if (side === 'left' || side === 'right') currentSetRootCollapse(side, true);
                break;
              }

              case 'NODE_TOGGLE_COLLAPSE': {
                 const { id: nodeId } = payload;
                 const newNodes = currentNodes.map((n) =>
                    n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n,
                 );
                 setGraph(newNodes, currentEdges);
                 break;
              }

              // Các case style khác giữ nguyên, đảm bảo copy đủ từ code cũ của bạn nếu có thêm
              default:
                break;
            }
          } catch (e) {
            console.error('WS message error:', e);
          }
        };

        ws.onclose = () => {
          console.log(`🔴 WS Disconnected`);
          wsRef.current = null;
          setIsConnected(false);
          // Reconnect logic
          if (isMounted) {
            const timeout = Math.min(1000 * 2 ** retryCount, 10000);
            retryCount++;
            reconnectTimeoutRef.current = setTimeout(connect, timeout);
          }
        };

        ws.onerror = (err) => {
          // console.error('WS Error:', err); // un-comment nếu cần debug
        };

      } catch (err) {
        console.error('WS Connect Error', err);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [
    mindmapId, isAuthed, isGuest, isDataLoaded, shouldConnect,
    getAccessToken, addToast, setGraph, setPeerInfo, updatePeerCursor, removePeer, sendPresence
  ]);

  return { sendPatch, sendCursor, isConnected };
}