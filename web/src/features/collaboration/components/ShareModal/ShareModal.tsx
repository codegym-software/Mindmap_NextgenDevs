/**
 * Modal chia sẻ (Share).
 * Tuân thủ User Story #18, #19, #21, #23.
 */
import React, { useState, useMemo } from 'react';
import Modal from '../../../../core/components/Modal/Modal';
import Button from '../../../../core/components/Button/Button';
import InputField from '../../../../core/components/Form/InputField';
import UserAvatar from '../../../shared/components/UserAvatar';
import Spinner from '../../../../core/components/Spinner/Spinner';
import { useCollaboration } from '../../hooks/useCollaboration';
import { MindmapSummary, Collaborator } from '../../../../core/types';
import { useAuth } from '../../../auth/hooks/useAuth';
import { Link, Copy, Globe, Lock, Users, ChevronDown, UserX, UserCheck } from 'lucide-react';
import { useToast } from '../../../../core/hooks/useToast';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    mindmap: MindmapSummary | null; // Cần mindmap để lấy settings
}

// Component Select Quyền (Dropdown)
const PermissionSelect: React.FC<{
    permission: 'EDITOR' | 'VIEWER';
    onChange: (newPermission: 'EDITOR' | 'VIEWER') => void;
    disabled?: boolean;
}> = ({ permission, onChange, disabled }) => {
    return (
        <select
            value={permission}
            onChange={(e) => onChange(e.target.value as 'EDITOR' | 'VIEWER')}
            disabled={disabled}
            className="bg-gray-700 border border-gray-600 rounded-md text-xs text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
        >
            <option value="EDITOR">Có thể chỉnh sửa</option>
            <option value="VIEWER">Chỉ xem</option>
        </select>
    );
};


const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, mindmap }) => {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const mindmapId = mindmap?.id || null;

    // --- State cho Modal ---
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePermission, setInvitePermission] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
    const [publicAccess, setPublicAccess] = useState<'VIEWER' | 'DISABLED'>(
        mindmap?.accessSettings.publicAccessLevel || 'DISABLED'
    );
    
    // --- Hook Quản lý Collaboration ---
    const {
        collaborators,
        isLoading,
        inviteCollaborator,
        updateCollaboratorPermission,
        removeCollaborator,
        updatePublicAccess,
    } = useCollaboration(isOpen ? mindmapId : null); // Chỉ fetch khi modal mở

    // Cập nhật state nội bộ khi mindmap prop thay đổi
    React.useEffect(() => {
        if (mindmap) {
            setPublicAccess(mindmap.accessSettings.publicAccessLevel || 'DISABLED');
        }
    }, [mindmap]);
    
    // Lọc ra owner và collaborators
    const owner = useMemo(
        () => collaborators.find(c => c.permission === 'OWNER'),
        [collaborators]
    );
    const otherCollaborators = useMemo(
        () => collaborators.filter(c => c.permission !== 'OWNER' && c.userId !== currentUser?.sub),
        [collaborators, currentUser?.sub]
    );

    const shareLink = `${window.location.origin}/share/${mindmap?.id}`;

    // --- Handlers ---

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink);
        addToast("Đã sao chép link!", "success");
    };

    const handleInvite = async () => {
        if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
            addToast("Vui lòng nhập email hợp lệ.", "error");
            return;
        }
        await inviteCollaborator(inviteEmail, invitePermission);
        setInviteEmail(''); // Reset input
    };
    
    const handlePublicAccessChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLevel = e.target.value as 'VIEWER' | 'DISABLED';
        const newSettings = {
            isPublic: newLevel === 'VIEWER',
            publicAccessLevel: newLevel
        };
        
        const success = await updatePublicAccess(newSettings);
        if (success) {
            setPublicAccess(newLevel);
            // Cập nhật store dashboard (nếu cần)
            // (Hiện tại store dashboard sẽ tự fetch lại)
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Chia sẻ "${mindmap?.name || ''}"`} size="md">
            
            {/* 1. Mời bằng Email (User Story #21) */}
            <div className="flex items-start gap-3">
                <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Nhập email để mời..."
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <PermissionSelect permission={invitePermission} onChange={setInvitePermission} />
                <Button onClick={handleInvite} isLoading={isLoading} disabled={isLoading} className="!px-3">
                    Gửi lời mời
                </Button>
            </div>
            
            <div className="h-px bg-gray-700 my-4" />

            {/* 2. Chia sẻ công khai (User Story #18, #19) */}
            <div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {publicAccess === 'VIEWER' ? <Globe size={18} className="text-blue-400" /> : <Lock size={18} className="text-gray-400" />}
                        <span className="font-medium text-white">Chia sẻ công khai</span>
                    </div>
                    <select
                        value={publicAccess}
                        onChange={handlePublicAccessChange}
                        className="bg-gray-700 border border-gray-600 rounded-md text-xs text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="DISABLED">Vô hiệu hóa</option>
                        <option value="VIEWER">Bất kỳ ai (Chỉ xem)</option>
                    </select>
                </div>
                {publicAccess === 'VIEWER' && (
                    <div className="flex items-center gap-2 mt-3 pl-7">
                        <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-300"
                            onFocus={(e) => e.target.select()}
                        />
                        <Button variant="outline" size="sm" onClick={handleCopyLink} className="!gap-1.5">
                            <Copy size={14} /> Sao chép
                        </Button>
                    </div>
                )}
            </div>

            <div className="h-px bg-gray-700 my-4" />

            {/* 3. Danh sách cộng tác viên (User Story #23) */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                     <Users size={18} className="text-gray-400" />
                     <span className="font-medium text-white">Những người có quyền truy cập</span>
                </div>
                
                {isLoading && collaborators.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-gray-400">
                        <Spinner />
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {/* Owner */}
                        {owner && (
                             <div className="flex items-center justify-between p-2 rounded-lg" key={owner.userId}>
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={owner.avatarUrl} name={owner.displayName} size="md" />
                                    <div>
                                        <div className="text-sm font-medium text-white">{owner.displayName || owner.userId} {owner.userId === currentUser?.sub && '(Bạn)'}</div>
                                        <div className="text-xs text-gray-400">{owner.email || '...'}</div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 font-medium">Chủ sở hữu</span>
                            </div>
                        )}
                        
                        {/* Collaborators */}
                        {otherCollaborators.map(collab => (
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50" key={collab.userId}>
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={collab.avatarUrl} name={collab.displayName} size="md" />
                                    <div>
                                        <div className="text-sm font-medium text-white">{collab.displayName || collab.userId}</div>
                                        <div className="text-xs text-gray-400">{collab.email || '...'}</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                     <PermissionSelect 
                                         permission={collab.permission}
                                         onChange={(newPerm) => updateCollaboratorPermission(collab.userId, newPerm)}
                                     />
                                     <Button variant="ghost" size="icon" className="!h-7 !w-7 text-gray-400 hover:!text-red-400 hover:!bg-red-500/10" title="Xóa quyền truy cập" onClick={() => removeCollaborator(collab.userId)}>
                                         <UserX size={16} />
                                     </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end mt-6">
                 <Button variant="gradient" onClick={onClose}>Xong</Button>
            </div>
        </Modal>
    );
};

export default ShareModal;
