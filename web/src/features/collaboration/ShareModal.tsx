import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Globe,
  Lock,
  UserPlus,
  Trash2,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Code,
  Bell,
  Mail,
  Link as LinkIcon,
  ChevronDown,
  Shield,
  Layout,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import {
  mindmapsApi,
  Collaborator,
  Permission,
  ShareSettingsResponse,
} from '../../services/mindmapsApi';
import { useAuth } from '../../hooks/useAuth';
import type { RequestUser } from '../../hooks/useMindmapAccess';
import ConfirmModal from '../../components/common/ConfirmModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mindmapId: string;
  isOwner: boolean;
  pendingRequests?: RequestUser[];
  onApproveRequest?: (uid: string, perm: Permission) => void;
  onDenyRequest?: (uid: string) => void;
};

type TabType = 'invite' | 'social' | 'embed';

export default function ShareModal({
  isOpen,
  onClose,
  mindmapId,
  isOwner,
  pendingRequests = [],
  onApproveRequest,
  onDenyRequest,
}: Props) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('invite');
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shareSettings, setShareSettings] = useState<ShareSettingsResponse | null>(null);

  const [workspaceVisibility, setWorkspaceVisibility] = useState<
    'PRIVATE' | 'WORKSPACE_VIEW' | 'WORKSPACE_EDIT'
  >('PRIVATE');

  // State cho form mời
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<Permission>('VIEWER');
  const [isInviting, setIsInviting] = useState(false);
  const [requestPermissions, setRequestPermissions] = useState<Record<string, Permission>>({});

  // State cho Confirm Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ userId: string; name: string } | null>(null);

  const handleApproveRequestInternal = async (uid: string, perm: Permission) => {
    if (!onApproveRequest) return;
    try {
      await onApproveRequest(uid, perm);
      await loadData();
    } catch (e) {
      console.error('Approve request failed:', e);
    }
  };

  const handleDenyRequestInternal = async (uid: string) => {
    if (!onDenyRequest) return;
    try {
      await onDenyRequest(uid);
    } catch (e) {
      console.error('Deny request failed:', e);
    }
  };

  useEffect(() => {
    if (isOpen && mindmapId) {
      void loadData();
      setActiveTab('invite');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mindmapId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [collabs, settings] = await Promise.all([
        mindmapsApi.getCollaborators(mindmapId),
        mindmapsApi.get(mindmapId),
      ]);

      setCollaborators(collabs);

      const doc: any = settings;
      const viewLink = doc.accessSettings?.isPublic
        ? `${window.location.origin}/share/${mindmapId}`
        : null;
      setShareSettings({
        mindmapId,
        isPublic: doc.accessSettings?.isPublic || false,
        publicAccessLevel: doc.accessSettings?.publicAccessLevel || 'DISABLED',
        shareLink: viewLink,
      });

      if (doc.accessSettings?.workspaceVisibility) {
        setWorkspaceVisibility(doc.accessSettings.workspaceVisibility);
      }
    } catch (e) {
      console.error(e);
      addToast('Không thể tải thông tin chia sẻ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await mindmapsApi.inviteCollaborator(mindmapId, inviteEmail, invitePermission);
      addToast(`Đã mời ${inviteEmail} thành công`, 'success');
      setInviteEmail('');
      await loadData();
    } catch (e: any) {
      addToast(e?.response?.data?.detail || 'Mời thất bại', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPerm: Permission) => {
    try {
      await mindmapsApi.updateCollaboratorPermission(mindmapId, userId, newPerm);
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, permission: newPerm } : c))
      );
      addToast('Đã cập nhật quyền', 'success');
    } catch (e) {
      addToast('Cập nhật thất bại', 'error');
    }
  };

  const handleRemoveClick = (userId: string, displayName: string) => {
    setUserToRemove({ userId, name: displayName });
    setIsConfirmModalOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!userToRemove) return;
    try {
      await mindmapsApi.removeCollaborator(mindmapId, userToRemove.userId);
      setCollaborators((prev) => prev.filter((c) => c.userId !== userToRemove.userId));
      addToast('Đã xóa thành công', 'success');
    } catch (e) {
      addToast('Xóa thất bại', 'error');
    } finally {
      setIsConfirmModalOpen(false);
      setUserToRemove(null);
    }
  };

  const handleRemoveCancel = () => {
    setIsConfirmModalOpen(false);
    setUserToRemove(null);
  };

  const handleUpdateWorkspaceVisibility = async (
    value: 'PRIVATE' | 'WORKSPACE_VIEW' | 'WORKSPACE_EDIT'
  ) => {
    try {
      setWorkspaceVisibility(value);
      addToast('Đã cập nhật chế độ chia sẻ trong Workspace', 'success');
    } catch (e) {
      console.error(e);
      addToast('Lỗi cập nhật', 'error');
    }
  };

  const handleUpdatePublicAccess = async (value: 'NONE' | 'VIEW' | 'EDIT') => {
    const isPublic = value !== 'NONE';
    const publicAccessLevel =
      value === 'NONE' ? 'DISABLED' : value === 'VIEW' ? 'VIEW' : 'EDIT';

    try {
      const res = await mindmapsApi.updateShareSettings(mindmapId, {
        isPublic,
        publicAccessLevel,
      });

      const link = isPublic ? `${window.location.origin}/share/${mindmapId}` : null;
      setShareSettings({ ...res, shareLink: link });
      addToast('Đã cập nhật chế độ chia sẻ công khai', 'success');
    } catch (e) {
      addToast('Lỗi cập nhật settings', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => addToast('Đã sao chép vào bộ nhớ tạm', 'success'))
      .catch(() => addToast('Không thể sao chép', 'error'));
  };

  // Helpers
  const currentUrl = shareSettings?.shareLink || window.location.href;
  const editLink =
    shareSettings?.isPublic && shareSettings?.publicAccessLevel === 'EDIT'
      ? `${window.location.origin}/editor/${mindmapId}`
      : null;
  const embedCode = `<iframe src="${currentUrl}?embed=true" width="800" height="600" frameborder="0" style="border:1px solid #eee; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

  const shareToSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    if (!shareSettings?.isPublic) {
      addToast('Vui lòng bật "Chia sẻ công khai" trước.', 'error');
      return;
    }
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=Check out my mindmap!`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
        break;
    }
    window.open(url, '_blank', 'width=600,height=400');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden transform transition-all border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-xl text-gray-900">Chia sẻ</h3>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý quyền truy cập và liên kết</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Custom Tabs (Segmented Control) */}
        <div className="px-6 py-4 pb-0 bg-white">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            {(['invite', 'social', 'embed'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'invite' && 'Mời & Link'}
                {tab === 'social' && 'Mạng xã hội'}
                {tab === 'embed' && 'Nhúng'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Đang tải thông tin...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* === TAB 1: INVITE & LINKS === */}
              {activeTab === 'invite' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  
                  {/* Section: Public Link */}
                  <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 transition-all hover:border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-full shrink-0 ${shareSettings?.isPublic ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                        {shareSettings?.isPublic ? <Globe size={22} /> : <Lock size={22} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-semibold text-gray-900">Quyền truy cập chung</h4>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-3">
                            Thiết lập quyền xem cho bất kỳ ai có liên kết này.
                        </p>

                        {isOwner && (
                           <div className="relative">
                              <select
                                value={
                                  shareSettings?.publicAccessLevel === 'DISABLED'
                                    ? 'NONE'
                                    : shareSettings?.publicAccessLevel === 'VIEW'
                                    ? 'VIEW'
                                    : 'EDIT'
                                }
                                onChange={(e) => handleUpdatePublicAccess(e.target.value as any)}
                                className="appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
                              >
                                <option value="NONE">🔒 Bị giới hạn (Chỉ người được mời)</option>
                                <option value="VIEW">👀 Bất kỳ ai có link đều có thể xem</option>
                                <option value="EDIT">✏️ Bất kỳ ai có link đều có thể sửa</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={16} />
                              </div>
                           </div>
                        )}

                        {/* Public Links Input Group */}
                        {shareSettings?.isPublic && shareSettings.shareLink && (
                          <div className="mt-4 space-y-3">
                             {/* View Link */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Link xem</label>
                                <div className="flex shadow-sm rounded-lg overflow-hidden group">
                                  <div className="bg-white border border-gray-300 border-r-0 flex items-center px-3 text-gray-400">
                                      <LinkIcon size={16}/>
                                  </div>
                                  <input
                                    readOnly
                                    value={shareSettings.shareLink}
                                    className="flex-1 bg-white border border-gray-300 border-l-0 border-r-0 text-gray-600 text-sm py-2 px-1 focus:outline-none truncate"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(shareSettings.shareLink!)}
                                    className="bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-600 px-4 font-medium transition-colors border-l-0 flex items-center gap-2 text-sm"
                                  >
                                    <Copy size={14} /> Sao chép
                                  </button>
                                </div>
                            </div>

                            {/* Edit Link (Optional) */}
                            {editLink && (
                              <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Link chỉnh sửa</label>
                                  <div className="flex shadow-sm rounded-lg overflow-hidden group">
                                     <div className="bg-white border border-gray-300 border-r-0 flex items-center px-3 text-gray-400">
                                         <Shield size={16}/>
                                     </div>
                                    <input
                                      readOnly
                                      value={editLink}
                                      className="flex-1 bg-white border border-gray-300 border-l-0 border-r-0 text-gray-600 text-sm py-2 px-1 focus:outline-none truncate"
                                    />
                                    <button
                                      onClick={() => copyToClipboard(editLink)}
                                      className="bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-600 px-4 font-medium transition-colors border-l-0 flex items-center gap-2 text-sm"
                                    >
                                      <Copy size={14} /> Sao chép
                                    </button>
                                  </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Section: Invite */}
                  {isOwner && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                             <h4 className="font-semibold text-gray-900">Mời thành viên</h4>
                             <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">Qua email</span>
                        </div>
                      <form onSubmit={handleInvite} className="flex gap-2">
                        <div className="flex-1 relative">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Mail size={18} />
                             </div>
                            <input
                              type="email"
                              placeholder="Nhập email (vd: abc@gmail.com)"
                              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm shadow-sm transition-all"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              required
                            />
                        </div>
                        <div className="relative w-28 shrink-0">
                            <select
                                value={invitePermission}
                                onChange={(e) => setInvitePermission(e.target.value as Permission)}
                                className="w-full h-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none font-medium text-gray-700"
                            >
                                <option value="VIEWER">Xem</option>
                                <option value="EDITOR">Sửa</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                        </div>
                        <button
                          type="submit"
                          disabled={isInviting}
                          className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm shrink-0 flex items-center gap-2"
                        >
                          {isInviting ? <span className="animate-spin">⏳</span> : <UserPlus size={18} />}
                          <span>Mời</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Section: Pending Requests */}
                  {isOwner && pendingRequests.length > 0 && (
                    <div className="mt-4 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-amber-100/50 border-b border-amber-200 flex items-center gap-2 text-amber-800 text-sm font-semibold">
                            <Bell size={16} className="fill-amber-600 text-amber-600" />
                            Yêu cầu chờ duyệt ({pendingRequests.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                        {pendingRequests.map((req) => {
                            const currentPerm =
                            requestPermissions[req.uid] ||
                            (req.requestedPermission as Permission) ||
                            'VIEWER';
                            return (
                            <div key={req.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-amber-100 shadow-sm gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold border border-amber-200">
                                        {req.displayName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-gray-900">{req.displayName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            {req.email} <span className="text-gray-300">•</span> {new Date(req.timestamp).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <select
                                        value={currentPerm}
                                        onChange={(e) => setRequestPermissions((prev) => ({ ...prev, [req.uid]: e.target.value as Permission }))}
                                        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="VIEWER">Viewer</option>
                                        <option value="EDITOR">Editor</option>
                                    </select>
                                    <div className="flex gap-1">
                                        <button onClick={() => onDenyRequest && handleDenyRequestInternal(req.uid)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Từ chối">
                                            <X size={16} />
                                        </button>
                                        <button onClick={() => onApproveRequest && handleApproveRequestInternal(req.uid, currentPerm)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Duyệt">
                                            <Check size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    </div>
                  )}

                  {/* Section: List Collaborators */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center justify-between">
                         <span>Thành viên trong nhóm</span>
                         <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{collaborators.length}</span>
                    </h4>
                    
                    <div className="max-h-56 overflow-y-auto space-y-1 -mx-2 px-2">
                        {collaborators.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm italic">
                                Chưa có thành viên nào. Hãy mời thêm người!
                            </div>
                        )}
                      {collaborators.map((collab) => (
                        <div
                          key={collab.userId}
                          className="group flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border-2 border-white ring-1 ring-gray-100">
                              {collab.avatarUrl ? (
                                <img src={collab.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                collab.displayName?.[0]?.toUpperCase() || '?'
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-1.5">
                                {collab.displayName || 'Unknown User'}
                                {collab.userId === user?.sub && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Bạn</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{collab.email || 'No email'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {collab.permission === 'OWNER' ? (
                              <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                <Shield size={12} className="fill-amber-600" /> Chủ sở hữu
                              </div>
                            ) : isOwner ? (
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                    <select
                                    value={collab.permission}
                                    onChange={(e) => handleUpdatePermission(collab.userId, e.target.value as Permission)}
                                    className="text-xs border-none bg-transparent font-medium text-gray-600 hover:text-blue-600 focus:ring-0 cursor-pointer pr-4 py-1 text-right outline-none"
                                    >
                                    <option value="VIEWER">Viewer</option>
                                    <option value="EDITOR">Editor</option>
                                    </select>
                                    {/* Fake arrow for styling */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={12} />
                                    </div>
                                </div>
                                
                                <button
                                  onClick={() => handleRemoveClick(collab.userId, collab.displayName)}
                                  className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Xóa quyền truy cập"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{collab.permission}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB 2: SOCIAL === */}
              {activeTab === 'social' && (
                <div className="space-y-6 pt-2 animate-in fade-in zoom-in-95 duration-300">
                  {!shareSettings?.isPublic && (
                    <div className="bg-orange-50 text-orange-800 text-sm p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                      <Lock className="shrink-0 mt-0.5 text-orange-500" size={18} />
                      <div>
                        <strong className="block font-semibold mb-1">Mindmap đang ở chế độ riêng tư</strong>
                        Bạn cần bật "Chia sẻ công khai" ở tab <em>Mời & Link</em> để người khác có thể xem mindmap khi bạn chia sẻ.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: 'facebook', name: 'Facebook', color: 'bg-[#1877F2]', icon: Facebook },
                        { id: 'twitter', name: 'Twitter (X)', color: 'bg-black', icon: Twitter },
                        { id: 'linkedin', name: 'LinkedIn', color: 'bg-[#0077B5]', icon: Linkedin }
                    ].map((item) => (
                        <button
                        key={item.id}
                        onClick={() => shareToSocial(item.id as any)}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-200"
                        >
                        <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                            <item.icon size={28} fill="white" />
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{item.name}</span>
                        </button>
                    ))}
                  </div>
                </div>
              )}

              {/* === TAB 3: EMBED === */}
              {activeTab === 'embed' && (
                <div className="space-y-5 pt-2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-sm">
                        <Layout size={20} className="shrink-0 mt-0.5 text-blue-600" />
                        <div>
                            <span className="font-semibold block mb-1">Nhúng vào website</span>
                            Sao chép mã iframe bên dưới để nhúng mindmap này vào blog hoặc website cá nhân của bạn.
                        </div>
                  </div>

                  <div className="relative group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                        <Code size={14}/> Mã nhúng (Iframe)
                    </label>
                    <textarea
                      readOnly
                      value={embedCode}
                      className="w-full h-32 bg-gray-800 text-gray-300 font-mono text-xs rounded-xl p-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                    />
                    <button
                      onClick={() => copyToClipboard(embedCode)}
                      className="absolute top-8 right-3 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                      title="Sao chép mã"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">Chiều rộng (Width)</label>
                      <input
                        type="text"
                        defaultValue="800px"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">Chiều cao (Height)</label>
                      <input
                        type="text"
                        defaultValue="600px"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleRemoveCancel}
        onConfirm={handleRemoveConfirm}
        title="Xóa quyền truy cập"
        message={`Bạn có chắc chắn muốn xóa "${userToRemove?.name}" khỏi danh sách cộng tác viên? Họ sẽ không thể truy cập mindmap này nữa.`}
        confirmText="Xóa bỏ"
        cancelText="Hủy"
      />
    </div>
  );
}