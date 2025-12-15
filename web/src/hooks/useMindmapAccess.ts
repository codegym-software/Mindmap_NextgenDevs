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

export type PermissionState = 'loading' | 'allowed' | 'denied';
export type RequestStatus = 'none' | 'pending' | 'rejected';

export type AccessPermission = 'VIEWER' | 'EDITOR';

export interface RequestUser {
  uid: string;
  displayName: string;
  timestamp: number;
  requestedPermission?: AccessPermission;
}

export interface MindmapAccessDoc {
  ownerId?: string;
  allowedUsers?: string[];
  pendingRequests?: RequestUser[];
  lastDecisions?: {
    [uid: string]: {
      status: 'approved' | 'rejected';
      permission: AccessPermission;
      decidedAt: number;
    };
  };
  updatedAt?: number;
  version?: number;
}

interface UseMindmapAccessResult {
  permission: PermissionState;
  isOwner: boolean;
  pendingRequests: RequestUser[];
  requestStatus: RequestStatus;
  requestAccess: (opts?: { requestedPermission?: AccessPermission }) => Promise<void>;
  approveRequest: (uid: string, perm: AccessPermission) => Promise<void>;
  denyRequest: (uid: string) => Promise<void>;
}

export const useMindmapAccess = (
  mindmapId: string,
  currentUser: any,
): UseMindmapAccessResult => {
  const [permission, setPermission] = useState<PermissionState>('loading');
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<RequestUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!mindmapId) {
      setPermission('allowed');
      return;
    }

    // ✅ GUEST MODE: map local -> cấp quyền ngay, KHÔNG connect Firestore
    if (mindmapId.startsWith('guest-')) {
      setPermission('allowed');
      setIsOwner(true);
      setRequestStatus('none');
      setPendingRequests([]);
      return;
    }

    const uid: string | undefined = currentUser?.id || currentUser?.sub;
    const docRef = doc(db, 'mindmapAccess', mindmapId);

    const unsubscribe = onSnapshot(docRef, (docSnap: DocumentSnapshot<DocumentData>) => {
      if (import.meta.env.MODE === 'development') {
        console.debug('[useMindmapAccess] snapshot for', mindmapId, {
          exists: docSnap.exists(),
          data: docSnap.exists() ? docSnap.data() : null,
        });
      }

      if (!docSnap.exists()) {
        setPermission('denied');
        setIsOwner(false);
        setPendingRequests([]);
        setRequestStatus('none');
        return;
      }

      const data = docSnap.data() as MindmapAccessDoc;
      const ownerId: string | undefined = data.ownerId;
      const allowedUsers: string[] = data.allowedUsers || [];
      const requests: RequestUser[] = data.pendingRequests || [];

      setPendingRequests(requests);

      if (!uid) {
        setIsOwner(false);
        setPermission('denied');
        setRequestStatus('none');
        return;
      }

      if (uid === ownerId) {
        setIsOwner(true);
        setPermission('allowed');
        setRequestStatus('none');
        return;
      }

      if (allowedUsers.includes(uid)) {
        setIsOwner(false);
        setPermission('allowed');
        setRequestStatus('none');
        return;
      }

      const myReq = requests.find((r) => r.uid === uid);
      const lastDecision = data.lastDecisions?.[uid];

      if (lastDecision?.status === 'rejected') {
        setIsOwner(false);
        setPermission('denied');
        setRequestStatus('rejected');
        return;
      }

      setIsOwner(false);
      setPermission('denied');
      setRequestStatus(myReq ? 'pending' : 'none');
    });

    return () => unsubscribe();
  }, [mindmapId, currentUser]);

  const isGuest = !!mindmapId && mindmapId.startsWith('guest-');

  // Xin quyền truy cập
  const requestAccess = async (opts?: { requestedPermission?: AccessPermission }) => {
    if (isGuest) return;

    const uid: string | undefined = currentUser?.id || currentUser?.sub;
    if (!mindmapId || !uid) return;

    const requestedPermission: AccessPermission = opts?.requestedPermission ?? 'VIEWER';

    const displayName =
      currentUser?.username || currentUser?.email || currentUser?.name || 'Unknown User';

    const docRef = doc(db, 'mindmapAccess', mindmapId);

    const newRequest: RequestUser = {
      uid,
      displayName,
      timestamp: Date.now(),
      requestedPermission,
    };

    await setDoc(
      docRef,
      {
        pendingRequests: arrayUnion(newRequest),
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    setRequestStatus('pending');
  };

  // Duyệt quyền (Owner)
  const approveRequest = async (requesterId: string, perm: AccessPermission) => {
    if (isGuest) return;
    if (!mindmapId) return;

    const docRef = doc(db, 'mindmapAccess', mindmapId);
    const reqToRemove = pendingRequests.find((r) => r.uid === requesterId);
    if (!reqToRemove) return;

    const effectivePerm: AccessPermission = perm || reqToRemove.requestedPermission || 'VIEWER';

    await updateDoc(docRef, {
      allowedUsers: arrayUnion(requesterId),
      pendingRequests: arrayRemove(reqToRemove),
      [`lastDecisions.${requesterId}`]: {
        status: 'approved',
        permission: effectivePerm,
        decidedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
  };

  // Từ chối yêu cầu (Owner)
  const denyRequest = async (requesterId: string) => {
    if (isGuest) return;
    if (!mindmapId) return;

    const docRef = doc(db, 'mindmapAccess', mindmapId);
    const reqToRemove = pendingRequests.find((r) => r.uid === requesterId);
    if (!reqToRemove) return;

    await updateDoc(docRef, {
      pendingRequests: arrayRemove(reqToRemove),
      [`lastDecisions.${requesterId}`]: {
        status: 'rejected',
        permission: reqToRemove.requestedPermission || 'VIEWER',
        decidedAt: Date.now(),
      },
      updatedAt: Date.now(),
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
