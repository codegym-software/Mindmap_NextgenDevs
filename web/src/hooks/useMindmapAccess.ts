import { useState, useEffect, useCallback, useRef } from 'react';
import { mindmapsApi, Permission, AccessRequestDto } from '../services/mindmapsApi';

export type PermissionState = 'loading' | 'allowed' | 'denied';
export type RequestStatus = 'none' | 'pending' | 'rejected';

// Map structure để UI dễ hiển thị
export interface RequestUser {
  uid: string;
  displayName: string;
  timestamp: number;
  requestedPermission?: Permission;
}

interface UseMindmapAccessResult {
  permission: PermissionState;
  isOwner: boolean;
  pendingRequests: RequestUser[];
  requestStatus: RequestStatus;
  requestAccess: (opts?: { requestedPermission?: Permission }) => Promise<void>;
  approveRequest: (uid: string, perm: Permission) => Promise<void>;
  denyRequest: (uid: string) => Promise<void>;
  refreshPermissions: () => void;
}

export const useMindmapAccess = (
  mindmapId: string,
  currentUser: any,
): UseMindmapAccessResult => {
  const [permission, setPermission] = useState<PermissionState>('loading');
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<RequestUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  
  // Dùng để trigger reload thủ công từ component cha (khi approve/deny xong)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshPermissions = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const isGuest = !!mindmapId && mindmapId.startsWith('guest-');

  // 1. Kiểm tra quyền truy cập (Permission Check)
  useEffect(() => {
    let isMounted = true;

    // Reset state khi đổi mindmap
    if (!mindmapId) {
      setPermission('allowed');
      return;
    }

    // ✅ GUEST MODE: Luôn cho phép, không gọi API
    if (isGuest) {
      setPermission('allowed');
      setIsOwner(true); // Guest là chủ sở hữu bản local
      setRequestStatus('none');
      setPendingRequests([]);
      return;
    }

    // Nếu là User thật, gọi API để check quyền chuẩn xác
    const checkAccess = async () => {
      // Nếu chưa có user, vẫn thử gọi (trường hợp Public View)
      // Editor.tsx sẽ lo việc redirect nếu API trả về 401/403
      setPermission('loading');

      try {
        const data = await mindmapsApi.get(mindmapId);
        
        if (!isMounted) return;

        setPermission('allowed');
        
        // Check Owner dựa trên ID trả về từ Server
        const uid = currentUser?.sub || currentUser?.id;
        if (uid && data.ownerId === uid) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }
        setRequestStatus('none');

      } catch (error: any) {
        if (!isMounted) return;
        
        const status = error?.response?.status;

        // 403: Đã login nhưng không có quyền
        if (status === 403) {
          setPermission('denied');
          setIsOwner(false);
          // Giữ trạng thái pending nếu người dùng vừa bấm gửi request
          setRequestStatus(prev => prev === 'pending' ? 'pending' : 'none');
        } 
        // 401: Token hết hạn hoặc chưa login
        else if (status === 401) {
           setPermission('denied');
           setIsOwner(false);
        }
        else {
           // Các lỗi khác (404, 500...)
           console.error("[Access] Check access failed:", error);
           setPermission('denied'); 
        }
      }
    };

    checkAccess();

    return () => { isMounted = false; };
  }, [mindmapId, currentUser, refreshTrigger, isGuest]);

  // 2. Polling lấy danh sách yêu cầu (Chỉ chạy nếu là Owner và không phải Guest)
  useEffect(() => {
    if (!isOwner || !mindmapId || isGuest) {
        setPendingRequests([]);
        return;
    }

    let isMounted = true;
    const fetchRequests = async () => {
        try {
            // Gọi API lấy danh sách chờ duyệt từ MongoDB
            const reqs = await mindmapsApi.getPendingRequests(mindmapId);
            if (isMounted) {
                // Convert DTO sang format UI cần
                const mapped: RequestUser[] = reqs.map(r => ({
                    uid: r.userId,
                    displayName: r.requesterName || r.requesterEmail || 'Unknown',
                    timestamp: new Date(r.createdAt).getTime(),
                    requestedPermission: r.requestedPermission
                }));
                setPendingRequests(mapped);
            }
        } catch (e) {
            // Lỗi quyền hoặc mạng, bỏ qua log để tránh spam console
        }
    };

    fetchRequests(); // Gọi ngay lần đầu
    const interval = setInterval(fetchRequests, 10000); // Poll mỗi 10s

    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [isOwner, mindmapId, refreshTrigger, isGuest]);

  // --- Actions (Gọi API Backend) ---

  const requestAccess = async (opts?: { requestedPermission?: Permission }) => {
    if (isGuest) return;
    try {
        await mindmapsApi.requestAccess(mindmapId, opts?.requestedPermission || 'VIEWER');
        setRequestStatus('pending');
    } catch (e: any) {
        // Nếu API trả về 409 (Conflict) nghĩa là đã request rồi -> vẫn set pending
        const status = e?.response?.status;
        if (status === 400 || status === 409) {
            setRequestStatus('pending');
        } else {
            console.error("Request access failed", e);
            throw e;
        }
    }
  };

  const approveRequest = async (requesterId: string, perm: Permission) => {
    if (isGuest) return;
    // Cập nhật UI ngay lập tức (Optimistic update)
    setPendingRequests(prev => prev.filter(r => r.uid !== requesterId));
    // Trigger refresh để đảm bảo đồng bộ với server lần sau
    setTimeout(refreshPermissions, 1000); 
  };

  const denyRequest = async (requesterId: string) => {
    if (isGuest) return;
    setPendingRequests(prev => prev.filter(r => r.uid !== requesterId));
    setTimeout(refreshPermissions, 1000);
  };

  return {
    permission,
    requestStatus,
    pendingRequests,
    isOwner,
    requestAccess,
    approveRequest,
    denyRequest,
    refreshPermissions
  };
};