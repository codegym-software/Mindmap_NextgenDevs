import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { EdgeData, useEditorStore } from '../app/store/useEditorStore';
import { useChatStore } from '../app/store/useChatStore';
import { Permission } from '../services/mindmapsApi';

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
  onPermissionUpdate?: (newPermission: Permission) => void;
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

// Helper debounce để gom nhiều layout requests liên tiếp
const debounceFunc = (func: Function, wait: number) => {
  let timeout: any;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const getMySenderId = (user: any) => user?.sub || user?.id || user?.uid;

// [FIX] Helper function để tạo URL WebSocket chính xác
const getWebSocketUrl = (mindmapId: string, token: string) => {
    // 1. Lấy URL gốc từ biến môi trường (Prod: https://api.nhom7nextgen.cloud/api)
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

    // 2. Chuyển đổi giao thức: http -> ws, https -> wss
    // Lưu ý: Logic cũ có thể đã thay thế sai port nếu apiUrl chứa port
    // Ở đây ta chỉ thay protocol, giữ nguyên domain và port (nếu có)
    let wsUrl = apiUrl.replace(/^http/, 'ws');

    // 3. Xử lý đường dẫn:
    // Backend endpoint là "/ws/mindmap/{id}". 
    // Nếu apiUrl có đuôi "/api", ta phải cắt bỏ nó đi để ghép với "/ws"
    if (wsUrl.endsWith('/api')) {
        wsUrl = wsUrl.slice(0, -4);
    }
    // Cắt bỏ dấu / thừa ở cuối nếu có
    if (wsUrl.endsWith('/')) {
        wsUrl = wsUrl.slice(0, -1);
    }

    return `${wsUrl}/ws/mindmap/${mindmapId}?token=${token}`;
};

export function useRealtime({
  mindmapId,
  isGuest,
  isDataLoaded,
  isOwner,
  userInfo,
  onLayoutRequest,
  onSetRootCollapse,
  shouldConnect,
  onPermissionUpdate,
}: UseRealtimeProps) {
  const { getAccessToken, isAuthed, user } = useAuth();
  const { addToast } = useToast();

  const { setGraph, setPeerInfo, updatePeerCursor, removePeer } = useEditorStore();
  const addChatMessage = useChatStore((s) => s.addMessage);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const latestProps = useRef({
    isOwner,
    userInfo,
    onLayoutRequest,
    onSetRootCollapse,
    onPermissionUpdate,
  });

  useEffect(() => {
    latestProps.current = { isOwner, userInfo, onLayoutRequest, onSetRootCollapse, onPermissionUpdate };
  }, [isOwner, userInfo, onLayoutRequest, onSetRootCollapse, onPermissionUpdate]);

  const sendPatch = useCallback((type: string, payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      const message = JSON.stringify({ type, payload });
      ws.send(message);
    } catch (e) {
      console.error('[sendPatch] ❌ WS sendPatch error:', e);
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

  const debouncedLayout = useRef(
    debounceFunc((keepCamera: boolean) => {
      const { onLayoutRequest: layoutFn } = latestProps.current;
      requestAnimationFrame(() => {
        layoutFn(keepCamera);
      });
    }, 150),
  ).current;

  const getPeerName = (senderId: string) => {
    const state: any = useEditorStore.getState();
    const peer = state.peers?.[senderId];
    return peer?.name || 'Một người dùng';
  };

  useEffect(() => {
    if (!mindmapId || !isAuthed || isGuest || !isDataLoaded || !shouldConnect) {
      return;
    }

    let isMounted = true;
    let retryCount = 0;

    const connect = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !isMounted) return;

        const wsUrl = getWebSocketUrl(mindmapId, token);
        console.log('Connecting to WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`🟢 WebSocket connected: ${mindmapId}`);
          setIsConnected(true);
          retryCount = 0;
          sendPresence();
        };

        ws.onmessage = (event) => {
          try {
            const msg: BroadcastPatch = JSON.parse(event.data);
            const { type, payload, senderId } = msg;

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
                if (currentIsOwner && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'FULL_SYNC',
                      payload: { nodes: currentNodes, edges: currentEdges },
                    }),
                  );
                }
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

              case 'CHAT_MESSAGE': {
                if (!payload?.content) break;
                addChatMessage({
                  id: payload.id, 
                  userId: senderId,
                  senderName: payload.senderName || 'Người dùng',
                  content: payload.content,
                  createdAt: payload.createdAt || new Date().toISOString(),
                });
                break;
              }

              case 'USER_PRESENCE': {
                const name = payload?.name || 'User';
                const color = payload?.color || '#999999';
                const state: any = useEditorStore.getState();
                const isNewPeer = !state.peers?.[senderId];
                setPeerInfo(senderId, { name, color });
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
                if (payload?.nodes && payload?.edges) {
                  setGraph(payload.nodes, payload.edges);
                  addToast('Đã đồng bộ dữ liệu mới nhất.', 'success');
                }
                break;
              }

              case 'NODE_MOVE': {
                const { id: nodeId, x, y } = payload || {};
                const newNodes = currentNodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n));
                setGraph(newNodes, currentEdges);
                debouncedLayout(true);
                break;
              }

              case 'NODE_TEXT_CHANGE': {
                const { id: nodeId, text } = payload || {};
                const newNodes = currentNodes.map((n) => (n.id === nodeId ? { ...n, nodeText: text } : n));
                setGraph(newNodes, currentEdges);
                debouncedLayout(true);
                break;
              }

              case 'NODE_CREATE': {
                const { node: feNode, edge: feEdge } = payload || {};
                if (!feNode) break;
                const nextEdges = feEdge ? [...currentEdges, feEdge] : currentEdges;
                setGraph([...currentNodes, feNode], nextEdges);
                debouncedLayout(true);
                break;
              }

              case 'NODE_DELETE': {
                const { nodeIds } = payload || {};
                const set = new Set((nodeIds || []) as string[]);
                const newNodes = currentNodes.filter((n) => !set.has(n.id));
                const newEdges = currentEdges.filter((e) => !set.has(e.from) && !set.has(e.to));
                setGraph(newNodes, newEdges);
                debouncedLayout(true);
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
                debouncedLayout(true);
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

              case 'GRAPH_UPDATE': {
                if (payload?.nodes && payload?.edges) {
                  setGraph(payload.nodes, payload.edges);
                  debouncedLayout(true);
                }
                break;
              }

              case 'PERMISSION_REVOKED': {
                const targetUserId = payload?.targetUserId;
                const myId = getMySenderId(user);
                
                if (targetUserId && myId && targetUserId === myId) {
                  addToast('⛔ Bạn đã bị thu hồi quyền truy cập mindmap này.', 'error');
                  if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                  }
                  setTimeout(() => {
                    window.location.href = '/dashboard';
                  }, 1000);
                }
                break;
              }

              case 'PERMISSION_UPDATED': {
                const targetUserId = payload?.targetUserId;
                const newPermission = payload?.newPermission as Permission;
                const myId = getMySenderId(user);
                
                if (targetUserId && myId && targetUserId === myId && newPermission) {
                  const permissionText = newPermission === 'EDITOR' ? 'chỉnh sửa' : 'xem';
                  addToast(`✅ Yêu cầu của bạn đã được chấp nhận! Bạn hiện có quyền ${permissionText}.`, 'success');
                  if (latestProps.current.onPermissionUpdate) {
                    latestProps.current.onPermissionUpdate(newPermission);
                  }
                }
                break;
              }

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
          if (isMounted) {
            const timeout = Math.min(1000 * 2 ** retryCount, 10000);
            retryCount++;
            reconnectTimeoutRef.current = setTimeout(connect, timeout);
          }
        };

        ws.onerror = (err) => {
           // console.error('WS Error:', err);
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