// src/hooks/useMindmapAccess.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { mindmapsApi, Permission } from '../services/mindmapsApi';

export type PermissionState = 'loading' | 'allowed' | 'denied';
export type RequestStatus = 'none' | 'pending' | 'rejected';

export interface RequestUser {
  uid: string;
  displayName: string;
  email: string;
  timestamp: number;
  requestedPermission?: Permission;
}

interface UseMindmapAccessResult {
  permission: PermissionState;
  isOwner: boolean;
  userPermission: Permission | null; // ⭐ THÊM MỚI - Export quyền cụ thể của user
  pendingRequests: RequestUser[];
  requestStatus: RequestStatus;
  publicAccessLevel: 'DISABLED' | 'VIEW' | 'EDIT';
  requestAccess: (opts?: { requestedPermission?: Permission }) => Promise<void>;
  approveRequest: (uid: string, perm: Permission) => Promise<void>;
  denyRequest: (uid: string) => Promise<void>;
  refreshPermissions: () => void;
  handlePermissionUpdate: (newPermission: Permission) => void;
}

export const useMindmapAccess = (
  mindmapId: string,
  currentUser: any,
): UseMindmapAccessResult => {
  const [permission, setPermission] = useState<PermissionState>('loading');
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<RequestUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [publicAccessLevel, setPublicAccessLevel] = useState<'DISABLED' | 'VIEW' | 'EDIT'>('DISABLED');
  const [userPermission, setUserPermission] = useState<Permission | null>(null); // ⭐ UNCOMMENT - Lưu quyền cụ thể

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshPermissions = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  const isLocalGuest = !!mindmapId && mindmapId.startsWith('guest-');
  const userId = currentUser?.sub || currentUser?.id;

  // =================================================================
  // 1. CHECK ACCESS LOGIC (Hàm này dùng chung cho load đầu & polling)
  // =================================================================
  const checkAccess = useCallback(async () => {
      // ⭐ Special case: Guest user
      if (isLocalGuest) {
        setPermission('allowed');
        setIsOwner(true);
        setUserPermission('OWNER');
        return;
      }
      
      try {
        const data = await mindmapsApi.get(mindmapId);
        
        if (data.accessSettings) {
            setPublicAccessLevel(data.accessSettings.publicAccessLevel);
        }
        
        // Nếu API trả về thành công -> Allowed
        setPermission('allowed');
        
        // ⭐ SET USER PERMISSION (OWNER/EDITOR/VIEWER)
        if (userId && data.ownerId === userId) {
          setIsOwner(true);
          setUserPermission('OWNER');
          setRequestStatus('none'); // Owner không cần request
        } else {
          setIsOwner(false);
          
          // Check collaborators
          const myCollab = (data.collaborators || []).find(c => c.userId === userId);
          if (myCollab) {
            setUserPermission(myCollab.permission);
            // ✅ FIX: Nếu đã là collaborator (có quyền rồi) → Chắc chắn không còn pending request
            setRequestStatus('none');
          } else {
            // Fallback to public access level
            const publicLevel = data.accessSettings?.publicAccessLevel;
            if (publicLevel === 'VIEW') {
              setUserPermission('VIEWER');
              // ✅ FIX: Public viewer không có pending request (vào được rồi)
              setRequestStatus('none');
            } else if (publicLevel === 'EDIT') {
              setUserPermission('EDITOR');
              setRequestStatus('none');
            } else {
              setUserPermission(null);
              // Không set requestStatus ở đây - giữ nguyên trạng thái cũ
            }
          }
        }

      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 403 || status === 401) {
          setPermission('denied');
          setIsOwner(false);
          setUserPermission(null);
        } else {
          console.error("[Access] Check error:", error);
          setPermission('denied');
          setUserPermission(null);
        }
      }
  }, [mindmapId, userId, isLocalGuest]);

  // =================================================================
  // 2. EFFECT: CHECK LẦN ĐẦU & KHI CÓ THAY ĐỔI ID/USER
  // =================================================================
  useEffect(() => {
    if (!mindmapId) {
      setPermission('allowed');
      return;
    }

    if (isLocalGuest) {
      setPermission('allowed');
      setIsOwner(true);
      return;
    }

    // Gọi lần đầu ngay lập tức
    checkAccess();

  }, [mindmapId, userId, refreshTrigger, isLocalGuest, checkAccess]);


  // =================================================================
  // 3. [MỚI - QUAN TRỌNG] EFFECT POLLING: TỰ ĐỘNG CHECK QUYỀN MỖI 10s
  // =================================================================
  useEffect(() => {
    if (!mindmapId || isLocalGuest) return;

    // Polling mỗi 10 giây để xem quyền có bị thay đổi bởi Owner không
    // Hoặc nếu đang bị Denied thì xem đã được Approve chưa
    const interval = setInterval(() => {
        checkAccess();
    }, 10000); 

    return () => clearInterval(interval);
  }, [mindmapId, isLocalGuest, checkAccess]);


  // =================================================================
  // 4. FETCH PENDING REQUESTS (Chỉ Owner)
  // =================================================================
  useEffect(() => {
    if (!isOwner || !mindmapId || isLocalGuest) {
        setPendingRequests([]);
        return;
    }

    let isMounted = true;
    const fetchRequests = async () => {
        try {
            const reqs = await mindmapsApi.getPendingRequests(mindmapId);
            if (isMounted) {
                const mapped: RequestUser[] = reqs.map(r => ({
                    uid: r.userId,
                    displayName: r.requesterName || r.requesterEmail || 'Unknown',
                    email: r.requesterEmail || 'No Email',
                    timestamp: new Date(r.createdAt).getTime(),
                    requestedPermission: r.requestedPermission
                }));
                setPendingRequests(mapped);
            }
        } catch (e) {
             // Silent fail
        }
    };

    fetchRequests();
    // Poll request list cũng mỗi 10s
    const interval = setInterval(fetchRequests, 10000); 

    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [isOwner, mindmapId, isLocalGuest]);

  // ... (Phần actions requestAccess, approveRequest... giữ nguyên như file của bạn)

  const requestAccess = async (opts?: { requestedPermission?: Permission }) => {
    if (isLocalGuest) return; 
    try {
        await mindmapsApi.requestAccess(mindmapId, opts?.requestedPermission || 'VIEWER');
        setRequestStatus('pending');
    } catch (e: any) {
        const status = e?.response?.status;
        if (status === 409 || status === 400) {
            setRequestStatus('pending');
        } else {
            throw e;
        }
    }
  };

  const approveRequest = async (requesterId: string, perm: Permission) => {
    if (isLocalGuest) return;
    try {
      await mindmapsApi.approveAccessRequest(mindmapId, requesterId, perm);
      setPendingRequests(prev => prev.filter(r => r.uid !== requesterId));
      setTimeout(refreshPermissions, 1000);
    } catch (error) {
      console.error('Failed to approve access request:', error);
      throw error;
    }
  };

  const denyRequest = async (requesterId: string) => {
    if (isLocalGuest) return;
    try {
      await mindmapsApi.rejectAccessRequest(mindmapId, requesterId);
      setPendingRequests(prev => prev.filter(r => r.uid !== requesterId));
      setTimeout(refreshPermissions, 1000);
    } catch (error) {
      console.error('Failed to deny access request:', error);
      throw error;
    }
  };

  // ⭐ [REALTIME] Hàm xử lý khi nhận PERMISSION_UPDATED từ WebSocket
  const handlePermissionUpdate = useCallback((newPermission: Permission) => {
    console.log('🔔 [PERMISSION_UPDATE] Received permission update:', newPermission);
    
    // 1. Cập nhật quyền cụ thể của user (quan trọng nhất!)
    setUserPermission(newPermission);
    
    // 2. Cập nhật trạng thái permission thành 'allowed'
    setPermission('allowed');
    
    // 3. Reset request status về 'none' (vì đã được duyệt)
    setRequestStatus('none');
    
    // 4. Trigger refresh để load lại dữ liệu mới nhất (nếu cần)
    refreshPermissions();
    
    console.log('✅ [PERMISSION_UPDATE] userPermission updated to', newPermission);
  }, [refreshPermissions]);

  return {
    permission,
    userPermission, // ⭐ EXPORT
    requestStatus,
    pendingRequests,
    isOwner,
    publicAccessLevel,
    requestAccess,
    approveRequest,
    denyRequest,
    refreshPermissions,
    handlePermissionUpdate, // ⭐ EXPORT CALLBACK
  };
};
