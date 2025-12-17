// src/features/auth/UserAvatarMenu.tsx
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, KeyRound, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// Helper function to check if user logged in with Google
const isGoogleUser = (user: Record<string, any> | null): boolean => {
    if (!user) return false;
    
    // Check if user has identities array (from Cognito JWT token)
    if (user.identities && Array.isArray(user.identities)) {
        return user.identities.some((identity: any) => 
            identity.providerType === 'Google' || 
            identity.providerName === 'Google' ||
            identity.providerId === 'Google'
        );
    }
    
    // Check if username contains Google prefix (common pattern in Cognito)
    if (user['cognito:username'] && typeof user['cognito:username'] === 'string') {
        return user['cognito:username'].startsWith('Google_');
    }
    
    // Check if sub (subject) contains Google indicator
    if (user.sub && typeof user.sub === 'string') {
        return user.sub.includes('Google') || user.sub.startsWith('Google_');
    }
    
    return false;
};

// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
export default function UserAvatarMenu() {
    const { isAuthed, user, login, logout, openChangePassword } = useAuth();
    const [isAvatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const { addToast } = useToast();
    
    const isGoogle = isGoogleUser(user);

    const handleChangePassword = () => {
        openChangePassword();
        setAvatarMenuOpen(false);
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setAvatarMenuOpen(!isAvatarMenuOpen)} 
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-blue-600 ring-2 ring-transparent hover:ring-blue-500 transition-all"
                title="Tài khoản"
            >
                {isAuthed && user?.email ? user.email[0].toUpperCase() : <User size={22} />}
            </button>

            {isAvatarMenuOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20"
                    onMouseLeave={() => setAvatarMenuOpen(false)}
                >
                    {isAuthed ? (
                        <>
                            <div className="px-3 py-2 border-b border-gray-200"> 
                                <p className="text-sm font-semibold text-gray-900 truncate" title={user?.email || ''}>{user?.email}</p> 
                            </div>
                            {!isGoogle && (
                                <button onClick={handleChangePassword} className="w-full text-left px-3 py-2 text-sm text-gray-700/90 hover:bg-gray-100 flex items-center gap-3"> 
                                    <KeyRound size={16} /> 
                                    Đổi mật khẩu
                                </button>
                            )}
                            <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-3"> 
                                <LogOut size={16} /> 
                                Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                          <button onClick={() => { login('login'); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700/90 hover:bg-gray-100 flex items-center gap-3"> 
                                <LogIn size={16} /> 
                                Đăng nhập
                            </button>
                            <button onClick={() => { login('register'); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700/90 hover:bg-gray-100 flex items-center gap-3"> 
                                <UserPlus size={16} /> 
                                Đăng ký
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}