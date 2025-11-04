/**
 * Modal chia sẻ mindmap (User Story #18, #19, #21, #23).
 */
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../../../../core/components/Modal/Modal';
import Button from '../../../../core/components/Button/Button';
import UserAvatar from '../../../shared/components/UserAvatar';
import Spinner from '../../../../core/components/Spinner/Spinner';
import { useCollaboration } from '../../hooks/useCollaboration';
import { MindmapSummary, MindmapDetailResponse } from '../../../../core/types';
import { useAuth } from '../../../auth/hooks/useAuth';
import { Copy, Globe, Lock, Users, Trash2 } from 'lucide-react';
import { useToast } from '../../../../core/hooks/useToast';

type Collaborator = NonNullable<MindmapDetailResponse['collaborators']>[0];

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    mindmap: MindmapSummary | null;
    onSettingsChange: (settings: MindmapSummary['accessSettings']) => void;
}

const PermissionSelect: React.FC<{
    permission: 'EDITOR' | 'VIEWER';
    onChange: (val: 'EDITOR' | 'VIEWER') => void;
    disabled?: boolean;
}> = ({ permission, onChange, disabled }) => (
    <select
        value={permission}
        onChange={(e) => onChange(e.target.value as 'EDITOR' | 'VIEWER')}
        disabled={disabled}
        className="bg-gray-700 border border-gray-600 rounded-md text-xs text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
    >
        <option value="VIEWER">Chỉ xem</option>
        <option value="EDITOR">Có thể chỉnh sửa</option>
    </select>
);

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, mindmap, onSettingsChange }) => {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePermission, setInvitePermission] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
    const [publicAccess, setPublicAccess] = useState<'VIEWER' | 'DISABLED'>('DISABLED');
    const [isInviting, setIsInviting] = useState(false);

    const {
        collaborators, isLoading, inviteCollaborator,
        updateCollaboratorPermission, removeCollaborator, updatePublicAccess
    } = useCollaboration(isOpen ? mindmap : null);

    useEffect(() => {
        if (mindmap) setPublicAccess(mindmap.accessSettings.publicAccessLevel || 'DISABLED');
    }, [mindmap]);

    const isOwner = currentUser?.sub === mindmap?.ownerId;
    const owner = useMemo(() => collaborators.find(c => c.permission === 'OWNER'), [collaborators]);
    const otherCollaborators = useMemo(() => collaborators.filter(c => c.permission !== 'OWNER'), [collaborators]);
    const shareLink = `${window.location.origin}/share/${mindmap?.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink);
        addToast("Đã sao chép link!", "success");
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
            addToast("Email không hợp lệ.", "error");
            return;
        }
        setIsInviting(true);
        const success = await inviteCollaborator(inviteEmail, invitePermission);
        if (success) setInviteEmail('');
        setIsInviting(false);
    };

    const handlePublicAccessChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLevel = e.target.value as 'VIEWER' | 'DISABLED';
        const newSettings = { isPublic: newLevel === 'VIEWER', publicAccessLevel: newLevel };
        const success = await updatePublicAccess(newSettings);
        if (success) {
            setPublicAccess(newLevel);
            onSettingsChange(newSettings);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setInviteEmail('');
            setInvitePermission('VIEWER');
        }, 300);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Chia sẻ "${mindmap?.name || ''}"`} size="md">
            {/* Invite */}
            {isOwner && (
                <form onSubmit={handleInvite} className="flex items-start gap-3">
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Nhập email..."
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <PermissionSelect permission={invitePermission} onChange={setInvitePermission} />
                    <Button type="submit" isLoading={isInviting} disabled={isLoading} className="!px-3">
                        Mời
                    </Button>
                </form>
            )}

            <div className="h-px bg-gray-700 my-4" />

            {/* Public Access */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {publicAccess === 'VIEWER' ? <Globe size={18} className="text-blue-400" /> : <Lock size={18} className="text-gray-400" />}
                    <span className="font-medium text-white">Chia sẻ công khai</span>
                </div>
                {isOwner ? (
                    <PermissionSelect
                        permission={publicAccess as 'VIEWER'}
                        onChange={(val) => handlePublicAccessChange({ target: { value: val } } as any)}
                    />
                ) : (
                    <span className="text-xs text-gray-500 font-medium">
                        {publicAccess === 'VIEWER' ? 'Công khai' : 'Riêng tư'}
                    </span>
                )}
            </div>
            {publicAccess === 'VIEWER' && (
                <div className="flex items-center gap-2 mt-3 pl-7">
                    <input type="text" readOnly value={shareLink} className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-300" onFocus={(e) => e.target.select()} />
                    <Button variant="outline" size="sm" onClick={handleCopyLink} className="!gap-1.5">
                        <Copy size={14} /> Sao chép
                    </Button>
                </div>
            )}

            <div className="h-px bg-gray-700 my-4" />

            {/* Access List */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Users size={18} className="text-gray-400" />
                    <span className="font-medium text-white">Quyền truy cập</span>
                </div>

                {isLoading && collaborators.length === 0 ? (
                    <div className="flex justify-center h-24"><Spinner /></div>
                ) : (
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-2 scrollbar-thin">
                        {owner && (
                            <div className="flex items-center justify-between p-2 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={owner.avatarUrl} name={owner.displayName} size="md" />
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {owner.displayName || owner.email} {owner.userId === currentUser?.sub && '(Bạn)'}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 font-medium mr-2">Chủ sở hữu</span>
                            </div>
                        )}
                        {otherCollaborators.map(collab => (
                            <div key={collab.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={collab.avatarUrl} name={collab.displayName} size="md" />
                                    <div>
                                        <div className="text-sm font-medium text-white">{collab.displayName}</div>
                                        <div className="text-xs text-gray-400">{collab.email}</div>
                                    </div>
                                </div>
                                {isOwner ? (
                                    <div className="flex items-center gap-2">
                                        <PermissionSelect
                                            permission={collab.permission}
                                            onChange={(p) => updateCollaboratorPermission(collab.userId, p)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="!h-7 !w-7 text-gray-400 hover:!text-red-400 hover:!bg-red-500/10"
                                            onClick={() => removeCollaborator(collab.userId)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-500 font-medium mr-2">
                                        {collab.permission === 'EDITOR' ? 'Editor' : 'Viewer'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ShareModal;