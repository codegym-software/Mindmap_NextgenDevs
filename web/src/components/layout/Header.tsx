// src/components/layout/Header.tsx
import { useAuth } from "../../hooks/useAuth";

export default function Header() {
  const { isAuthenticated, login, logout } = useAuth();
  const authed = isAuthenticated();

  return (
    <header className="fixed top-0 inset-x-0 h-16 bg-gray-900/80 backdrop-blur-md z-40">
      <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-white font-semibold">Mindmap</span>
        </div>
        <div className="flex items-center space-x-2">
          {!authed ? (
            <>
              <button onClick={login} className="px-4 py-2 rounded-md text-white/90 border border-white/30 hover:bg-gray-700/50 hover:scale-105 transition-all duration-200">
                Sign Up
              </button>
              <button onClick={login} className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105">
                Login
              </button>
            </>
          ) : (
            <button onClick={logout} className="px-4 py-2 rounded-md text-white/90 border border-white/30 hover:bg-gray-700/50 hover:scale-105 transition-all duration-200">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}