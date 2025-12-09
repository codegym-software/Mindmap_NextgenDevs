// src/hooks/useMindmapAccess.ts
import { useState, useEffect } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export interface RequestUser {
  uid: string;
  displayName: string;
  timestamp: number;
}

export type PermissionState = 'loading' | 'allowed' | 'denied';
export type RequestStatus = 'none' | 'pending' | 'rejected';

export const useMindmapAccess = (mindmapId: string, currentUser: any) => {
  const [permission, setPermission] = useState<PermissionState>('loading');
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<RequestUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!mindmapId) {
      setPermission('allowed');
      return;
    }

    const uid: string | undefined = currentUser?.id || currentUser?.sub;

    const docRef = doc(db, 'mindmapAccess', mindmapId); // 👈 ĐƯỜNG DẪN MỚI (2 segment → hợp lệ)

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap: DocumentSnapshot<DocumentData>) => {
        if (!docSnap.exists()) {
          // Chưa có document quyền → cho phép tạm (hoặc bạn có thể set 'denied' nếu muốn)
          setPermission('allowed');
          setIsOwner(false);
          setPendingRequests([]);
          setRequestStatus('none');
          return;
        }

        const data = docSnap.data() as any;
        const ownerId: string | undefined = data.ownerId;
        const allowedUsers: string[] = data.allowedUsers || [];
        const requests: RequestUser[] = data.pendingRequests || [];

        setPendingRequests(requests);

        // Chưa đăng nhập → xem như không có quyền, để AccessDeniedScreen xử lý login
        if (!uid) {
          setIsOwner(false);
          setPermission('denied');
          setRequestStatus('none');
          return;
        }

        // Chủ sở hữu
        if (uid === ownerId) {
          setIsOwner(true);
          setPermission('allowed');
          setRequestStatus('none');
          return;
        }

        // Đã được cấp quyền
        if (allowedUsers.includes(uid)) {
          setIsOwner(false);
          setPermission('allowed');
          setRequestStatus('none');
          return;
        }

        // Bị chặn → check xem đã gửi yêu cầu chưa
        setIsOwner(false);
        setPermission('denied');
        const myReq = requests.find((r) => r.uid === uid);
        setRequestStatus(myReq ? 'pending' : 'none');
      },
    );

    return () => unsubscribe();
  }, [mindmapId, currentUser]);

  // Xin quyền truy cập
  const requestAccess = async () => {
    const uid: string | undefined = currentUser?.id || currentUser?.sub;
    if (!mindmapId || !uid) return;

    const displayName =
      currentUser?.username ||
      currentUser?.email ||
      currentUser?.name ||
      'Unknown User';

    const docRef = doc(db, 'mindmapAccess', mindmapId);

    await setDoc(
      docRef,
      {
        // nếu doc chưa tồn tại thì tạo, còn tồn tại thì merge
        pendingRequests: arrayUnion({
          uid,
          displayName,
          timestamp: Date.now(),
        }),
      },
      { merge: true },
    );

    setRequestStatus('pending');
  };

  // Duyệt quyền (Owner)
  const approveRequest = async (requesterId: string) => {
    if (!mindmapId) return;

    const docRef = doc(db, 'mindmapAccess', mindmapId);
    const reqToRemove = pendingRequests.find((r) => r.uid === requesterId);
    if (!reqToRemove) return;

    await updateDoc(docRef, {
      allowedUsers: arrayUnion(requesterId),
      pendingRequests: arrayRemove(reqToRemove),
    });
  };

  // Từ chối yêu cầu (Owner)
  const denyRequest = async (requesterId: string) => {
    if (!mindmapId) return;

    const docRef = doc(db, 'mindmapAccess', mindmapId);
    const reqToRemove = pendingRequests.find((r) => r.uid === requesterId);
    if (!reqToRemove) return;

    await updateDoc(docRef, {
      pendingRequests: arrayRemove(reqToRemove),
    });
  };

  return {
    permission,
    requestStatus,
    pendingRequests,
    isOwner,
    requestAccess,
    approveRequest,
    denyRequest,
  };
};
