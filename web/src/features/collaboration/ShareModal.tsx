// src/features/collaboration/ShareModal.tsx
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
  QrCode,
  Bell,
  Mail,
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

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mindmapId: string;
  isOwner: boolean;

  // mới: queue request từ Firestore
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
  const [shareSettings, setShareSettings] = useState<ShareSettingsResponse | null>(
    null,
  );
  
  const [workspaceVisibility, setWorkspaceVisibility] = useState<
  'PRIVATE' | 'WORKSPACE_VIEW' | 'WORKSPACE_EDIT'
>('PRIVATE');

  // State cho form mời
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] =
    useState<Permission>('VIEWER');
  const [isInviting, setIsInviting] = useState(false);
  const [requestPermissions, setRequestPermissions] = useState<
  Record<string, Permission>
>({});

  // Load dữ liệu khi mở modal
  useEffect(() => {
    if (isOpen && mindmapId) {
      void loadData();
      setActiveTab('invite'); // Reset về tab đầu tiên
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mindmapId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [collabs, settings] = await Promise.all([
        mindmapsApi.getCollaborators(mindmapId),
        mindmapsApi.get(mindmapId), // Giả lập lấy settings từ detail
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
            // nếu BE có field này thì sync, còn không thì thôi
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
      await mindmapsApi.inviteCollaborator(
        mindmapId,
        inviteEmail,
        invitePermission,
      );
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
      await mindmapsApi.updateCollaboratorPermission(
        mindmapId,
        userId,
        newPerm,
      );
      setCollaborators((prev: Collaborator[]) =>
        prev.map((c: Collaborator) =>
          c.userId === userId ? { ...c, permission: newPerm } : c,
        ),
      );
      addToast('Đã cập nhật quyền', 'success');
    } catch (e) {
      addToast('Cập nhật thất bại', 'error');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa người này?')) return;
    try {
      await mindmapsApi.removeCollaborator(mindmapId, userId);
      setCollaborators((prev: Collaborator[]) =>
        prev.filter((c: Collaborator) => c.userId !== userId),
      );
      addToast('Đã xóa thành công', 'success');
    } catch (e) {
      addToast('Xóa thất bại', 'error');
    }
  };

  const handleUpdateWorkspaceVisibility = async (
  value: 'PRIVATE' | 'WORKSPACE_VIEW' | 'WORKSPACE_EDIT',
) => {
  try {
    // TODO: sau này nếu có API backend để lưu workspace visibility thì gọi ở đây
    setWorkspaceVisibility(value);
    addToast('Đã cập nhật chế độ chia sẻ trong Workspace', 'success');
  } catch (e) {
    console.error(e);
    addToast('Cập nhật chế độ chia sẻ trong Workspace thất bại', 'error');
  }
};


const handleUpdatePublicAccess = async (
  value: 'NONE' | 'VIEW' | 'EDIT',
) => {
  const isPublic = value !== 'NONE';
  const publicAccessLevel =
    value === 'NONE'
      ? 'DISABLED'
      : value === 'VIEW'
      ? 'VIEW'
      : 'EDIT';

  try {
    const res = await mindmapsApi.updateShareSettings(mindmapId, {
      isPublic,
      publicAccessLevel,
    });

    const link = isPublic
      ? `${window.location.origin}/share/${mindmapId}`
      : null;

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
      .catch(() =>
        addToast('Không thể sao chép vào bộ nhớ tạm', 'error'),
      );
  };

  // --- Helpers cho Social & Embed ---
  const currentUrl = shareSettings?.shareLink || window.location.href;
  const editLink =
    shareSettings?.isPublic && shareSettings?.publicAccessLevel === 'EDIT'
      ? `${window.location.origin}/editor/${mindmapId}`
      : null;
  const embedCode = `<iframe src="${currentUrl}?embed=true" width="800" height="600" frameborder="0" style="border:1px solid #eee; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

  const shareToSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    if (!shareSettings?.isPublic) {
      addToast(
        'Vui lòng bật "Chia sẻ công khai" ở tab Mời & Link trước khi chia sẻ.',
        'error',
      );
      return;
    }
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          currentUrl,
        )}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          currentUrl,
        )}&text=Check out my mindmap!`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          currentUrl,
        )}`;
        break;
    }
    window.open(url, '_blank', 'width=600,height=400');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">
            Chia sẻ Mindmap
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 pt-2 gap-6 text-sm font-medium text-gray-500">
          <button
            onClick={() => setActiveTab('invite')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'invite'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            Mời & Link
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'social'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            Mạng xã hội
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'embed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            Nhúng (Embed)
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <div className="p-6 overflow-y-auto">
            {/* TAB 1: INVITE */}
            {activeTab === 'invite' && (
              <div className="space-y-6">
                {/* Public Access */}
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div
                    className={`p-2 rounded-full mt-1 ${
                      shareSettings?.isPublic
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {shareSettings?.isPublic ? <Globe size={20} /> : <Lock size={20} />}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-medium text-gray-900">Chia sẻ công khai</h4>
                    </div>

                    <p className="text-sm text-gray-500 mb-2">
                      {shareSettings?.publicAccessLevel === 'DISABLED'
                        ? 'Chỉ những người được mời mới có thể truy cập'
                        : shareSettings?.publicAccessLevel === 'VIEW'
                        ? 'Bất kỳ ai có liên kết đều có thể xem'
                        : 'Bất kỳ ai có liên kết đều có thể chỉnh sửa'}
                    </p>

                    {isOwner && (
                      <div className="space-y-2 mb-3">
                        {/* PUBLIC ACCESS SELECT */}
                        <select
                          value={
                            shareSettings?.publicAccessLevel === 'DISABLED'
                              ? 'NONE'
                              : shareSettings?.publicAccessLevel === 'VIEW'
                              ? 'VIEW'
                              : 'EDIT'
                          }
                          onChange={(e) =>
                            handleUpdatePublicAccess(
                              e.target.value as 'NONE' | 'VIEW' | 'EDIT'
                            )
                          }
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white w-full"
                        >
                          <option value="NONE">Tắt</option>
                          <option value="VIEW">Bất kỳ ai có link: Xem</option>
                          <option value="EDIT">Bất kỳ ai có link: Chỉnh sửa</option>
                        </select>

                        {/* WORKSPACE VISIBILITY SELECT (tạm ẩn để gọn UI) */}
                        <div className="hidden">
                          <select
                            value={workspaceVisibility}
                            onChange={(e) =>
                              handleUpdateWorkspaceVisibility(
                                e.target.value as
                                  | 'PRIVATE'
                                  | 'WORKSPACE_VIEW'
                                  | 'WORKSPACE_EDIT'
                              )
                            }
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white w-full"
                          >
                            <option value="PRIVATE">Chỉ mình tôi và người được mời</option>
                            <option value="WORKSPACE_VIEW">Mọi người trong Workspace: Xem</option>
                            <option value="WORKSPACE_EDIT">Mọi người trong Workspace: Chỉnh sửa</option>
                          </select>
                        </div>

                      </div>
                    )}

                    {shareSettings?.isPublic && shareSettings.shareLink && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={shareSettings.shareLink}
                            className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg p-2 outline-none"
                            title="Link xem"
                          />
                          <button
                            onClick={() => copyToClipboard(shareSettings.shareLink!)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1 transition-colors"
                            title="Sao chép link xem"
                          >
                            <Copy size={16} />
                          </button>
                        </div>

                        {editLink && (
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={editLink}
                              className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg p-2 outline-none"
                              title="Link sửa"
                            />
                            <button
                              onClick={() => copyToClipboard(editLink)}
                              className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1 transition-colors"
                              title="Sao chép link sửa"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Invite Form */}
                {isOwner && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <UserPlus size={18} /> Mời cộng tác viên
                    </h4>
                    <form
                      onSubmit={handleInvite}
                      className="flex gap-2 flex-wrap"
                    >
                      <input
                        type="email"
                        placeholder="Nhập email (vd: abc@gmail.com)"
                        className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                      <select
                        value={invitePermission}
                        onChange={(e) =>
                          setInvitePermission(
                            e.target.value as Permission,
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white text-sm"
                      >
                        <option value="VIEWER">Xem</option>
                        <option value="EDITOR">Sửa</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isInviting}
                        className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                      >
                        {isInviting ? '...' : 'Mời'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Collaborators List */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">
                    Thành viên ({collaborators.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {collaborators.map((collab: Collaborator) => (
                      <div
                        key={collab.userId}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Avatar logic */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {collab.avatarUrl ? (
                                <img src={collab.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/>
                            ) : (
                                collab.displayName?.[0]?.toUpperCase() || '?'
                            )}
                          </div>

                          {/* Hiển thị Tên và Email */}
                          <div className="flex flex-col min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {collab.displayName || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                               {/* Hiển thị Email ở đây */}
                               <Mail size={10} />
                               {collab.email || 'No email'} 
                               {collab.userId === user?.sub && <span className="font-bold text-blue-600 ml-1">(Bạn)</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {collab.permission === 'OWNER' ? (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Chủ sở hữu
                            </span>
                          ) : isOwner ? (
                            <>
                              <select
                                value={collab.permission}
                                onChange={(e) =>
                                  handleUpdatePermission(
                                    collab.userId,
                                    e.target.value as Permission,
                                  )
                                }
                                className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer"
                              >
                                <option value="VIEWER">Viewer</option>
                                <option value="EDITOR">Editor</option>
                              </select>
                              <button
                                onClick={() =>
                                  handleRemove(collab.userId)
                                }
                                className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {collab.permission}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending access requests (Firestore queue) */}
                {isOwner && pendingRequests.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm flex items-center gap-2">
                    <Bell size={16} className="text-amber-500" />
                    Yêu cầu truy cập ({pendingRequests.length})
                  </h4>

                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {pendingRequests.map((req) => {
                      const currentPerm =
                        requestPermissions[req.uid] ||
                        (req.requestedPermission as Permission) ||
                        'VIEWER';

                      return (
                        <div
                          key={req.uid}
                          className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100"
                        >
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {req.displayName}
                            </div>

                            {/* [MỚI] Hiển thị Email */}
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <Mail size={10} /> {req.email || 'No Email'}
                            </div>

                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(req.timestamp).toLocaleString()}
                            </div>

                            {req.requestedPermission && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Yêu cầu quyền:{' '}
                                <span className="font-semibold">
                                  {req.requestedPermission === 'EDITOR' ? 'Chỉnh sửa' : 'Xem'}
                                </span>
                              </div>
                            )}
                          </div>


                          <div className="flex items-center gap-2">
                            <select
                              value={currentPerm}
                              onChange={(e) =>
                                setRequestPermissions((prev) => ({
                                  ...prev,
                                  [req.uid]: e.target.value as Permission,
                                }))
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white text-gray-700"
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                onDenyRequest && onDenyRequest(req.uid)
                              }
                              className="px-2 py-1 text-xs rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              Từ chối
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!onApproveRequest) return;
                                const permToGrant = currentPerm;
                                onApproveRequest(req.uid, permToGrant);
                              }}
                              className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Duyệt
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              </div>
            )}

            {/* TAB 2: SOCIAL */}
            {activeTab === 'social' && (
              <div className="space-y-8 text-center pt-4">
                {!shareSettings?.isPublic && (
                  <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg border border-yellow-200 mb-4 text-left">
                    Lưu ý: Bạn cần bật chế độ{' '}
                    <strong>Công khai</strong> ở tab &quot;Mời & Link&quot; để
                    người khác có thể xem mindmap từ liên kết chia sẻ.
                  </div>
                )}

                <div className="flex justify-center gap-8">
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 bg-[#1877F2] rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Facebook size={28} fill="white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      Facebook
                    </span>
                  </button>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Twitter size={28} fill="white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      X (Twitter)
                    </span>
                  </button>
                  <button
                    onClick={() => shareToSocial('linkedin')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 bg-[#0077B5] rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Linkedin size={28} fill="white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      LinkedIn
                    </span>
                  </button>
                </div>

                
              </div>
            )}

            {/* TAB 3: EMBED */}
            {activeTab === 'embed' && (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-gray-600">
                  Sao chép mã iframe bên dưới để nhúng mindmap này vào blog
                  hoặc website cá nhân của bạn.
                </p>

                <div className="relative">
                  <textarea
                    readOnly
                    value={embedCode}
                    className="w-full h-28 bg-gray-50 text-gray-600 font-mono text-xs rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    onClick={() => copyToClipboard(embedCode)}
                    className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded text-gray-600 transition-colors shadow-sm"
                    title="Sao chép mã"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Chiều rộng
                    </label>
                    <input
                      type="text"
                      defaultValue="800px"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Chiều cao
                    </label>
                    <input
                      type="text"
                      defaultValue="600px"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}