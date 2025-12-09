import React, { useEffect, useState } from 'react';
import { 
  X, Copy, Globe, Lock, UserPlus, Trash2, Check, 
  Facebook, Twitter, Linkedin, Code, QrCode 
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { mindmapsApi, Collaborator, Permission, ShareSettingsResponse } from '../../services/mindmapsApi';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mindmapId: string;
  isOwner: boolean;
};

type TabType = 'invite' | 'social' | 'embed';

export default function ShareModal({ isOpen, onClose, mindmapId, isOwner }: Props) {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('invite');
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shareSettings, setShareSettings] = useState<ShareSettingsResponse | null>(null);

  // State cho form mời
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<Permission>('VIEWER');
  const [isInviting, setIsInviting] = useState(false);

  // Load dữ liệu khi mở modal
  useEffect(() => {
    if (isOpen && mindmapId) {
      loadData();
      setActiveTab('invite'); // Reset về tab đầu tiên
    }
  }, [isOpen, mindmapId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [collabs, settings] = await Promise.all([
        mindmapsApi.getCollaborators(mindmapId),
        mindmapsApi.get(mindmapId) // Giả lập lấy settings từ detail
      ]);
      
      setCollaborators(collabs);
      
      const doc: any = settings; 
      setShareSettings({
          mindmapId,
          isPublic: doc.accessSettings?.isPublic || false,
          publicAccessLevel: doc.accessSettings?.publicAccessLevel || 'DISABLED',
          shareLink: doc.accessSettings?.isPublic ? `${window.location.origin}/editor/${mindmapId}` : null
      });

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
      loadData(); 
    } catch (e: any) {
      addToast(e.response?.data?.detail || 'Mời thất bại', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPerm: Permission) => {
    try {
      await mindmapsApi.updateCollaboratorPermission(mindmapId, userId, newPerm);
      setCollaborators(prev => prev.map(c => c.userId === userId ? { ...c, permission: newPerm } : c));
      addToast('Đã cập nhật quyền', 'success');
    } catch (e) {
      addToast('Cập nhật thất bại', 'error');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa người này?')) return;
    try {
      await mindmapsApi.removeCollaborator(mindmapId, userId);
      setCollaborators(prev => prev.filter(c => c.userId !== userId));
      addToast('Đã xóa thành công', 'success');
    } catch (e) {
      addToast('Xóa thất bại', 'error');
    }
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    try {
      const res = await mindmapsApi.updateShareSettings(mindmapId, isPublic, isPublic ? 'VIEW' : 'DISABLED');
      const link = isPublic ? `${window.location.origin}/editor/${mindmapId}` : null;
      setShareSettings({ ...res, shareLink: link });
      addToast(isPublic ? 'Đã bật Public Link' : 'Đã tắt Public Link', 'success');
    } catch (e) {
      addToast('Lỗi cập nhật settings', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Đã sao chép vào bộ nhớ tạm', 'success');
  };

  // --- Helpers cho Social & Embed ---
  const currentUrl = shareSettings?.shareLink || window.location.href;
  const embedCode = `<iframe src="${currentUrl}?embed=true" width="800" height="600" frameborder="0" style="border:1px solid #eee; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

  const shareToSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    if (!shareSettings?.isPublic) {
        addToast('Vui lòng bật "Chia sẻ công khai" trước khi đăng lên MXH.', 'error');
        return;
    }
    let url = '';
    switch(platform) {
        case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`; break;
        case 'twitter': url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=Check out my mindmap!`; break;
        case 'linkedin': url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`; break;
    }
    window.open(url, '_blank', 'width=600,height=400');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">Chia sẻ Mindmap</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>

        {/* Tabs - Giống Xmind */}
        <div className="flex border-b px-6 pt-2 gap-6 text-sm font-medium text-gray-500">
          <button 
            onClick={() => setActiveTab('invite')}
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'invite' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-800'}`}
          >
            Mời & Link
          </button>
          <button 
            onClick={() => setActiveTab('social')}
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'social' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-800'}`}
          >
            Mạng xã hội
          </button>
          <button 
            onClick={() => setActiveTab('embed')}
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'embed' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-800'}`}
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
                        <div className={`p-2 rounded-full mt-1 ${shareSettings?.isPublic ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                            {shareSettings?.isPublic ? <Globe size={20} /> : <Lock size={20} />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-medium text-gray-900">Chia sẻ công khai</h4>
                                {isOwner && (
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={shareSettings?.isPublic || false} onChange={e => handleTogglePublic(e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                                {shareSettings?.isPublic 
                                    ? "Bất kỳ ai có liên kết đều có thể xem." 
                                    : "Chỉ những người được mời mới có thể truy cập."}
                            </p>
                            
                            {shareSettings?.isPublic && (
                                <div className="flex gap-2">
                                    <input readOnly value={shareSettings.shareLink || ''} className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg p-2 outline-none" />
                                    <button onClick={() => copyToClipboard(shareSettings.shareLink || '')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1 transition-colors">
                                        <Copy size={16} />
                                    </button>
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
                            <form onSubmit={handleInvite} className="flex gap-2">
                                <input 
                                    type="email" 
                                    placeholder="Nhập email (vd: abc@gmail.com)" 
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    required
                                />
                                <select 
                                    value={invitePermission}
                                    onChange={e => setInvitePermission(e.target.value as Permission)}
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
                         <h4 className="font-medium text-gray-900 mb-2 text-sm">Thành viên ({collaborators.length})</h4>
                         <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                            {collaborators.map(collab => (
                                <div key={collab.userId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                            {collab.displayName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm text-gray-900">{collab.displayName}</div>
                                            <div className="text-xs text-gray-500">{collab.userId === user?.sub ? '(Bạn)' : 'Thành viên'}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {collab.permission === 'OWNER' ? (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Chủ sở hữu</span>
                                        ) : (
                                            isOwner ? (
                                                <>
                                                    <select 
                                                        value={collab.permission} 
                                                        onChange={(e) => handleUpdatePermission(collab.userId, e.target.value as Permission)}
                                                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                                    >
                                                        <option value="VIEWER">Viewer</option>
                                                        <option value="EDITOR">Editor</option>
                                                    </select>
                                                    <button onClick={() => handleRemove(collab.userId)} className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-500">{collab.permission}</span>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SOCIAL */}
            {activeTab === 'social' && (
                <div className="space-y-8 text-center pt-4">
                    {!shareSettings?.isPublic && (
                        <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg border border-yellow-200 mb-4 text-left">
                            Lưu ý: Bạn cần bật chế độ <strong>Công khai</strong> ở tab "Mời & Link" để người khác có thể xem mindmap từ liên kết chia sẻ.
                        </div>
                    )}
                    
                    <div className="flex justify-center gap-8">
                        <button onClick={() => shareToSocial('facebook')} className="flex flex-col items-center gap-2 group">
                            <div className="w-14 h-14 bg-[#1877F2] rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Facebook size={28} fill="white" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">Facebook</span>
                        </button>
                        <button onClick={() => shareToSocial('twitter')} className="flex flex-col items-center gap-2 group">
                            <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Twitter size={28} fill="white" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">X (Twitter)</span>
                        </button>
                        <button onClick={() => shareToSocial('linkedin')} className="flex flex-col items-center gap-2 group">
                            <div className="w-14 h-14 bg-[#0077B5] rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Linkedin size={28} fill="white" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">LinkedIn</span>
                        </button>
                    </div>

                    <div className="border-t pt-6 flex items-center gap-4 text-left">
                        <div className="bg-white p-2 border rounded-lg shadow-sm">
                            {/* QR Placeholder - Thực tế nên dùng thư viện qrcode.react */}
                            <QrCode size={80} className="text-gray-800" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">QR Code</h4>
                            <p className="text-xs text-gray-500 mt-1">Quét mã để xem nhanh trên điện thoại.</p>
                            <button className="text-blue-600 text-sm font-medium mt-2 hover:underline">Tải ảnh PNG</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: EMBED */}
            {activeTab === 'embed' && (
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-gray-600">
                        Sao chép mã iframe bên dưới để nhúng mindmap này vào blog hoặc website cá nhân của bạn.
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
                            <label className="block text-xs font-medium text-gray-700 mb-1">Chiều rộng</label>
                            <input type="text" defaultValue="800px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Chiều cao</label>
                            <input type="text" defaultValue="600px" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
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