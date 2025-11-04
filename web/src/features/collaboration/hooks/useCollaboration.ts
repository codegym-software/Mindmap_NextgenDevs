/**
 * Hook quản lý toàn bộ logic ShareModal.
 */
import { useState, useEffect, useCallback } from 'react';
import { MindmapSummary, MindmapDetailResponse } from '../../../core/types';
import { collaborationApi } from '../api/collaborationApi';
import { useToast } from '../../../core/hooks/useToast';

type Collaborator = NonNullable<MindmapDetailResponse['collaborators']>[0];

export function useCollaboration(mindmap: MindmapSummary | null) {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchCollaborators = useCallback(async () => {
        if (!mindmap) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await collaborationApi.list(mindmap.id);
            setCollaborators(data);
        } catch (e: any) {
            setError("Không thể tải danh sách cộng tác viên.");
            addToast("Không thể tải danh sách cộng tác viên", "error");
        } finally {
            setIsLoading(false);
        }
    }, [mindmap, addToast]);

    const inviteCollaborator = useCallback(async (email: string, permission: 'EDITOR' | 'VIEWER') => {
        if (!mindmap) return false;
        try {
            const newCollaborator = await collaborationApi.invite(mindmap.id, { email, permission });
            setCollaborators(prev => [...prev, newCollaborator]);
            addToast(`Đã mời ${email} thành công!`, "success");
            return true;
        } catch (e: any) {
            const errorMsg = e.response?.data?.detail || "Lời mời thất bại.";
            addToast(errorMsg, "error");
            return false;
        }
    }, [mindmap, addToast]);

    const updateCollaboratorPermission = useCallback(async (userId: string, permission: 'EDITOR' | 'VIEWER') => {
        if (!mindmap) return;
        try {
            const updated = await collaborationApi.updatePermission(mindmap.id, userId, permission);
            setCollaborators(prev => prev.map(c => c.userId === userId ? updated : c));
            addToast("Cập nhật quyền thành công!", "success");
        } catch {
            addToast("Cập nhật quyền thất bại.", "error");
        }
    }, [mindmap, addToast]);

    const removeCollaborator = useCallback(async (userId: string) => {
        if (!mindmap) return;
        try {
            await collaborationApi.remove(mindmap.id, userId);
            setCollaborators(prev => prev.filter(c => c.userId !== userId));
            addToast("Đã xóa cộng tác viên!", "success");
        } catch {
            addToast("Xóa thất bại.", "error");
        }
    }, [mindmap, addToast]);

    const updatePublicAccess = useCallback(async (settings: MindmapSummary['accessSettings']) => {
        if (!mindmap) return false;
        try {
            await collaborationApi.updateShareSettings(mindmap.id, settings);
            addToast("Cập nhật chia sẻ công khai thành công!", "success");
            return true;
        } catch {
            addToast("Cập nhật thất bại.", "error");
            return false;
        }
    }, [mindmap, addToast]);

    useEffect(() => {
        if (mindmap?.id) fetchCollaborators();
        else {
            setCollaborators([]);
            setError(null);
        }
    }, [mindmap?.id, fetchCollaborators]);

    return {
        collaborators,
        isLoading,
        error,
        inviteCollaborator,
        updateCollaboratorPermission,
        removeCollaborator,
        updatePublicAccess,
    };
}