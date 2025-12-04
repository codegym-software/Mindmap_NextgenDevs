// src/components/layout/Header.tsx
import { useAuth } from "../../hooks/useAuth";
import UserAvatarMenu from "../../features/auth/UserAvatarMenu";

export default function Header() {
  const { isAuthed, login } = useAuth();
  
  return (
    <header className="fixed top-0 inset-x-0 h-12 bg-black/5 backdrop-blur-md z-30 border-b border-gray-300">
      <div className="h-full w-full flex items-center justify-between">
        <a href="/dashboard" className="flex items-center space-x-3 pl-10 hover:opacity-80 transition-opacity">
          <img src="/icons/logo.png" alt="Logo" className="w-9 h-9 rounded-xl object-cover" /> 
          <span className="text-gray-900 font-semibold text-lg">CG Mind</span> 
        </a>
        <div className="flex items-center gap-3 pr-4 sm:pr-6 lg:pr-8">
          {!isAuthed ? (
            <>
              <button onClick={() => login('login')} className="px-5 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors duration-200">
                Đăng nhập
              </button>
              <button onClick={() => login('register')} className="px-5 py-2.5 rounded-lg text-white font-medium bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 hover:scale-105 shadow-sm">
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