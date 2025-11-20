// src/components/layout/Header.tsx
import { useAuth } from "../../hooks/useAuth";
import UserAvatarMenu from "../../features/auth/UserAvatarMenu";

export default function Header() {
  const { isAuthed, login } = useAuth();
  
  return (
    <header className="fixed top-0 inset-x-0 h-12 bg-black/5 backdrop-blur-md z-30 border-b border-gray-200">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <a href="/dashboard" className="flex items-center space-x-3">
          <img src="/icons/logo.png" alt="Logo" className="w-8 h-8 rounded-xl object-cover" /> 
          <span className="text-gray-900 font-semibold text-lg">CG Mind</span> 
        </a>
        <div className="flex items-center space-x-4">
          {!isAuthed ? (
            <>
              <button onClick={() => login('login')} className="px-3.5 py-1.5 rounded-md text-gray-700/90 font-medium hover:bg-gray-100/100 transition-colors duration-200"> {/* Changed */}
                Đăng nhập
              </button>
              <button onClick={() => login('register')} className="px-3.5 py-1.5 rounded-md text-white font-medium bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 hover:scale-105">
                Đăng ký
              </button>
            </>
          ) : (
            <UserAvatarMenu />
          )}
        </div>
      </div>
    </header>
  );
}