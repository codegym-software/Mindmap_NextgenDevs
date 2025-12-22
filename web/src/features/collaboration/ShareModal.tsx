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
  ChevronDown,
  ShieldAlert,
  Eye,
  Pencil,
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
        ? `${window.location.origin}/editor/${mindmapId}`
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

      const link = isPublic ? `${window.location.origin}/editor/${mindmapId}` : null;
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
      className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[550px] overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-gray-200 animate-[zoomIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-semibold text-xl text-gray-900">Chia sẻ Mindmap</h3>
            <p className="text-sm text-gray-500 mt-0.5">Quản lý quyền truy cập và cộng tác</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4">
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            {[
              { id: 'invite', label: 'Mời & Quyền' },
              { id: 'social', label: 'Mạng xã hội' },
              { id: 'embed', label: 'Mã nhúng' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center text-gray-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: INVITE */}
              {activeTab === 'invite' && (
                <div className="space-y-6">
                  {/* Public Access Card */}
                  <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg transition-colors duration-300 ${
                        shareSettings?.isPublic ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {shareSettings?.isPublic ? <Globe size={18} /> : <Lock size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold text-gray-900">Quyền truy cập chung</label>
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
                                onChange={(e) =>
                                    handleUpdatePublicAccess(e.target.value as 'NONE' | 'VIEW' | 'EDIT')
                                }
                                className="appearance-none bg-white border border-gray-300 text-gray-700 text-xs font-medium py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                >
                                <option value="NONE">Riêng tư</option>
                                <option value="VIEW">Công khai (Xem)</option>
                                <option value="EDIT">Công khai (Sửa)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {shareSettings?.isPublic 
                            ? 'Bất kỳ ai có liên kết đều có thể truy cập.'
                            : 'Chỉ những người được mời mới có thể truy cập mindmap này.'}
                        </p>
                      </div>
                    </div>

                    {shareSettings?.isPublic && shareSettings.shareLink && (
                      <div className="space-y-3 pt-2">
                         <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                {shareSettings.publicAccessLevel === 'EDIT' ? 'Link chia sẻ (Chỉnh sửa)' : 'Link chia sẻ (Chỉ xem)'}
                            </label>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <div className="pl-2 text-gray-400">
                                  {shareSettings.publicAccessLevel === 'EDIT' ? <Pencil size={14}/> : <Eye size={14}/>}
                                </div>
                                <input
                                    readOnly
                                    value={shareSettings.shareLink}
                                    className="flex-1 text-xs text-gray-600 outline-none min-w-0 bg-transparent font-mono"
                                />
                                <button
                                    onClick={() => copyToClipboard(shareSettings.shareLink!)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <Copy size={12} />
                                </button>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-100" />

                  {/* Invite Form */}
                  {isOwner && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <UserPlus size={16} className="text-gray-500"/> Mời thành viên
                      </h4>
                      <form onSubmit={handleInvite} className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Email người nhận..."
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                        <div className="relative w-28">
                             <select
                                value={invitePermission}
                                onChange={(e) => setInvitePermission(e.target.value as Permission)}
                                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                <option value="VIEWER">Xem</option>
                                <option value="EDITOR">Sửa</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isInviting}
                          className="bg-gradient-to-r from-purple-200 to-blue-200 hover:from-blue-300 hover:to-purple-300 text-black px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isInviting ? '...' : 'Mời'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Collaborators List */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Thành viên ({collaborators.length})
                    </h4>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                      {collaborators.map((collab) => (
                        <div
                          key={collab.userId}
                          className="group flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-indigo-50 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                              {collab.avatarUrl ? (
                                <img src={collab.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                collab.displayName?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm text-gray-900 truncate flex items-center gap-2">
                                {collab.displayName || 'Unknown User'}
                                {collab.userId === user?.sub && (
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">Bạn</span>
                                )}
                              </span>
                              <span className="text-xs text-gray-500 truncate">{collab.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {collab.permission === 'OWNER' ? (
                              <span className="text-xs font-medium text-gray-500 px-2 py-1">Chủ sở hữu</span>
                            ) : isOwner ? (
                              <>
                                <div className="relative group/select">
                                    <select
                                    value={collab.permission}
                                    onChange={(e) => handleUpdatePermission(collab.userId, e.target.value as Permission)}
                                    className="appearance-none bg-transparent hover:bg-gray-100 text-gray-600 font-medium text-xs py-1.5 pl-2 pr-6 rounded cursor-pointer focus:outline-none transition-colors"
                                    >
                                    <option value="VIEWER">Viewer</option>
                                    <option value="EDITOR">Editor</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/select:text-gray-600" />
                                </div>
                                <button
                                  onClick={() => handleRemoveClick(collab.userId, collab.displayName)}
                                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                  title="Xóa quyền truy cập"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{collab.permission}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Requests */}
                  {isOwner && pendingRequests.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Bell size={16} className="text-amber-500 fill-amber-500" />
                        Yêu cầu truy cập <span className="text-xs font-normal text-gray-500">({pendingRequests.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {pendingRequests.map((req) => (
                          <div key={req.uid} className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                    {req.displayName?.[0] || 'R'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{req.displayName}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Mail size={10} /> {req.email}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <div className="relative">
                                    <select
                                        value={requestPermissions[req.uid] || req.requestedPermission || 'VIEWER'}
                                        onChange={(e) => setRequestPermissions(prev => ({ ...prev, [req.uid]: e.target.value as Permission }))}
                                        className="appearance-none bg-white border border-amber-200 text-gray-700 text-xs py-1 pl-2 pr-6 rounded shadow-sm focus:outline-none"
                                    >
                                        <option value="VIEWER">Xem</option>
                                        <option value="EDITOR">Sửa</option>
                                    </select>
                                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <button
                                    onClick={() => onDenyRequest && handleDenyRequestInternal(req.uid)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
                                >
                                    Từ chối
                                </button>
                                <button
                                    onClick={() => onApproveRequest && handleApproveRequestInternal(req.uid, (requestPermissions[req.uid] || req.requestedPermission || 'VIEWER'))}
                                    className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1"
                                >
                                    <Check size={12}/> Duyệt
                                </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SOCIAL */}
              {activeTab === 'social' && (
                <div className="py-6 animate-[fadeIn_0.3s_ease-out]">
                  {!shareSettings?.isPublic && (
                    <div className="mx-auto max-w-sm mb-8 bg-orange-50 text-orange-800 text-xs px-4 py-3 rounded-lg border border-orange-100 flex items-start gap-2">
                      <ShieldAlert size={16} className="shrink-0 mt-0.5"/>
                      <span>
                         Mindmap này đang ở chế độ <strong>Riêng tư</strong>. Người nhận liên kết sẽ không thể xem được trừ khi bạn chuyển sang chế độ Công khai ở tab trước.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto">
                    {[
                        { id: 'facebook', icon: Facebook, color: 'bg-[#1877F2]', label: 'Facebook' },
                        { id: 'twitter', icon: Twitter, color: 'bg-black', label: 'X / Twitter' },
                        { id: 'linkedin', icon: Linkedin, color: 'bg-[#0077B5]', label: 'LinkedIn' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => shareToSocial(item.id as any)}
                            className="group flex flex-col items-center gap-3 w-full"
                        >
                            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-200 group-hover:-translate-y-1 group-hover:shadow-xl transition-all duration-300`}>
                                <item.icon size={28} fill="currentColor" strokeWidth={0} />
                            </div>
                            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                                {item.label}
                            </span>
                        </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: EMBED */}
              {activeTab === 'embed' && (
                <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-3 rounded-lg text-xs">
                     <Code size={16} className="shrink-0 mt-0.5" />
                     <p>Sao chép mã iframe bên dưới để nhúng mindmap này vào blog, tài liệu Notion hoặc website cá nhân của bạn.</p>
                  </div>

                  <div className="relative group">
                    <pre className="w-full h-32 bg-gray-900 text-gray-300 font-mono text-xs rounded-xl p-4 overflow-x-auto border border-gray-800 custom-scrollbar">
                        {embedCode}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode)}
                      className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors border border-white/10"
                      title="Sao chép mã"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chiều rộng</label>
                      <div className="relative">
                        <input type="text" defaultValue="800" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                        <span className="absolute right-3 top-2 text-xs text-gray-400">px</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chiều cao</label>
                      <div className="relative">
                        <input type="text" defaultValue="600" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                        <span className="absolute right-3 top-2 text-xs text-gray-400">px</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleRemoveConfirm}
        title="Xóa thành viên"
        message={`Bạn có chắc chắn muốn xóa "${userToRemove?.name}" khỏi danh sách? Họ sẽ mất quyền truy cập vào mindmap này.`}
        confirmText="Xóa quyền"
        cancelText="Hủy bỏ"
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}