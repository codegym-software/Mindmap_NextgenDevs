// src/components/layout/Header.tsx
import { useAuth } from "../../hooks/useAuth";
import UserAvatarMenu from "../../features/auth/UserAvatarMenu";

export default function Header() {
  const { isAuthed, login } = useAuth();
  
  return (
    <header className="fixed top-0 inset-x-0 h-14 bg-gray-900/80 backdrop-blur-md z-30 border-b border-gray-800">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <a href="/dashboard" className="flex items-center space-x-3">
          <img src="https://yt3.googleusercontent.com/ytc/AIdro_mmItxUPgungnKjiNO5J0hmAp298nWmx6KrRFatKGFX=s900-c-k-c0x00ffffff-no-rj" alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-white font-semibold text-lg">CG Mind</span>
        </a>
        <div className="flex items-center space-x-4">
          {!isAuthed ? (
            <>
              <button onClick={() => login('login')} className="px-4 py-2 rounded-md text-white/90 font-medium hover:bg-gray-700/50 transition-colors duration-200">
                Đăng nhập
              </button>
              <button onClick={() => login('register')} className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105">
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
