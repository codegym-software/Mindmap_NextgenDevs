/**
 * Component hiển thị nút Login/Register hoặc Avatar User.
 * Tái cấu trúc từ `features/auth/UserAvatarMenu.tsx` cũ.
 * Dùng trong `Header.tsx`.
 * Tuân thủ User Story #24, #26, #27, #30.
 */
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, KeyRound, LogOut, LogIn, UserPlus, Settings, HelpCircle } from 'lucide-react';
import { useToast } from '../../../core/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import Button from '../../../core/components/Button/Button';
import Spinner from '../../../core/components/Spinner/Spinner';

const UserAvatarMenu: React.FC = () => {
    const { isAuthed, user, login, logout, isLoading } = useAuth(); // Thêm isLoading
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSettings = () => {
        addToast("Chức năng Cài đặt đang phát triển.", "info");
        // navigate('/settings'); // Router #11
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        setIsMenuOpen(false);
        navigate('/logout'); // Router #... (LogoutHandler)
    };

    if (isLoading) {
        return <Spinner size="sm" />;
    }

    if (!isAuthed) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => login('login')}
                    className="!px-3 !h-9"
                >
                    Đăng nhập
                </Button>
                <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => login('register')}
                    className="!px-3 !h-9"
                >
                    Đăng ký
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-blue-300 ring-2 ring-transparent hover:ring-blue-500 transition-all focus:outline-none focus:ring-blue-500"
                title="Tài khoản"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
            >
                {user?.picture ? (
                    <img src={user.picture} alt={user.email} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <span className="font-medium">{user?.email?.[0].toUpperCase() || '?'}</span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div
                    className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700/80 rounded-lg shadow-2xl z-50 py-1.5 animate-fade-in-down"
                    onMouseLeave={() => setIsMenuOpen(false)}
                >
                    {/* User Info */}
                    <div className="px-3 py-2 border-b border-gray-700 mb-1">
                        <p className="text-sm font-semibold text-white truncate" title={user?.name || user?.email}>
                            {user?.name || 'Người dùng'}
                        </p>
                        <p className="text-xs text-gray-400 truncate" title={user?.email}>{user?.email}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <nav>
                        <button onClick={handleSettings} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/80 hover:text-white flex items-center gap-2.5 transition-colors">
                            <Settings size={16} /> Cài đặt (User Story #39)
                        </button>
                        <button onClick={() => addToast("Chức năng Trợ giúp đang phát triển.", "info")} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/80 hover:text-white flex items-center gap-2.5 transition-colors">
                            <HelpCircle size={16} /> Trợ giúp
                        </button>
                        
                        <div className="h-px bg-gray-700 my-1" />
                        
                        <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/80 hover:text-white flex items-center gap-2.5 transition-colors">
                            <LogOut size={16} /> Đăng xuất (User Story #30)
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default UserAvatarMenu;
