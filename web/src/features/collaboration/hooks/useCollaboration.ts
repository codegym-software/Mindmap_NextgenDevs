/**
 * Hook quản lý state và logic cho ShareModal.
 */
import { useState, useEffect, useCallback } from 'react';
import { Collaborator } from '../../../core/types';
import { collaborationApi } from '../api/collaborationApi';
import { useToast } from '../../../core/hooks/useToast';

export function useCollaboration(mindmapId: string | null) {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    // Fetch danh sách (Endpoint #9)
    const fetchCollaborators = useCallback(async () => {
        if (!mindmapId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await collaborationApi.list(mindmapId);
            setCollaborators(data);
        } catch (e: any) {
            console.error("Failed to fetch collaborators:", e);
            setError("Không thể tải danh sách cộng tác viên.");
            addToast("Không thể tải danh sách cộng tác viên", "error");
        } finally {
            setIsLoading(false);
        }
    }, [mindmapId, addToast]);

    // Mời (Endpoint #10)
    const inviteCollaborator = useCallback(async (email: string, permission: 'EDITOR' | 'VIEWER') => {
        if (!mindmapId) return;
        setIsLoading(true);
        try {
            const newCollaborator = await collaborationApi.invite(mindmapId, { email, permission });
            setCollaborators(prev => [...prev, newCollaborator]);
            addToast(`Đã mời ${email} thành công!`, "success");
        } catch (e: any) {
            console.error("Failed to invite collaborator:", e);
            const errorMsg = e.response?.data?.message || "Lời mời thất bại.";
            addToast(errorMsg, "error");
        } finally {
            setIsLoading(false);
        }
    }, [mindmapId, addToast]);

    // Cập nhật quyền (Endpoint #11)
    const updateCollaboratorPermission = useCallback(async (userId: string, permission: 'EDITOR' | 'VIEWER') => {
        if (!mindmapId) return;
        try {
            const updatedCollaborator = await collaborationApi.updatePermission(mindmapId, userId, permission);
            setCollaborators(prev => prev.map(c => c.userId === userId ? updatedCollaborator : c));
            addToast("Cập nhật quyền thành công!", "success");
        } catch (e: any) {
            console.error("Failed to update permission:", e);
            addToast("Cập nhật quyền thất bại.", "error");
        }
    }, [mindmapId, addToast]);

    // Xóa (Endpoint #12)
    const removeCollaborator = useCallback(async (userId: string) => {
        if (!mindmapId) return;
        try {
            await collaborationApi.remove(mindmapId, userId);
            setCollaborators(prev => prev.filter(c => c.userId !== userId));
            addToast("Đã xóa cộng tác viên!", "success");
        } catch (e: any) {
            console.error("Failed to remove collaborator:", e);
            addToast("Xóa thất bại.", "error");
        }
    }, [mindmapId, addToast]);

    // Cập nhật cài đặt public (Endpoint #8)
    const updatePublicAccess = useCallback(async (settings: MindmapSummary['accessSettings']) => {
        if (!mindmapId) return;
        try {
            await collaborationApi.updateShareSettings(mindmapId, settings);
            addToast("Cập nhật chia sẻ công khai thành công!", "success");
            return true; // Báo thành công
        } catch (e: any) {
            console.error("Failed to update public access:", e);
            addToast("Cập nhật thất bại.", "error");
            return false; // Báo thất bại
        }
    }, [mindmapId, addToast]);


    // Tải data khi mindmapId thay đổi
    useEffect(() => {
        if (mindmapId) {
            fetchCollaborators();
        } else {
            // Clear state nếu không có mindmapId
            setCollaborators([]);
            setError(null);
            setIsLoading(false);
        }
    }, [mindmapId, fetchCollaborators]);

    return {
        collaborators,
        isLoading,
        error,
        fetchCollaborators,
        inviteCollaborator,
        updateCollaboratorPermission,
        removeCollaborator,
        updatePublicAccess,
    };
}
