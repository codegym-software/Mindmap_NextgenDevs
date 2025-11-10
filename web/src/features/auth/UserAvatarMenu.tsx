// src/features/auth/UserAvatarMenu.tsx
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, KeyRound, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export default function UserAvatarMenu() {
    const { isAuthed, user, login, logout } = useAuth();
    const [isAvatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const { addToast } = useToast();

    const handleChangePassword = () => {
        addToast("Chức năng đổi mật khẩu đang được phát triển.", "info");
        setAvatarMenuOpen(false);
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setAvatarMenuOpen(!isAvatarMenuOpen)} 
                className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center font-bold text-blue-300 ring-2 ring-transparent hover:ring-blue-500 transition-all"
                title="Tài khoản"
            >
                {isAuthed && user?.email ? user.email[0].toUpperCase() : <User size={20} />}
            </button>

            {isAvatarMenuOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20"
                    onMouseLeave={() => setAvatarMenuOpen(false)}
                >
                    {isAuthed ? (
                        <>
                           <div className="px-3 py-2 border-b border-gray-700">
                               <p className="text-sm font-semibold text-white truncate" title={user?.email || ''}>{user?.email}</p>
                           </div>
                           <button onClick={handleChangePassword} className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-gray-700 flex items-center gap-3">
                                <KeyRound size={16} /> 
                                Đổi mật khẩu
                            </button>
                           <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-3">
                                <LogOut size={16} /> 
                                Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => { login('login'); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-gray-700 flex items-center gap-3">
                                <LogIn size={16} /> 
                                Đăng nhập
                            </button>
                            <button onClick={() => { login('register'); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-gray-700 flex items-center gap-3">
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

