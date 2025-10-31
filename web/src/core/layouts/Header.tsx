/**
 * Header chính của ứng dụng.
 * Tái cấu trúc từ `components/layout/Header.tsx` cũ.
 * Dùng trong `MainLayout.tsx`.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import AuthButtons from '../../features/auth/components/AuthButtons'; // Import component mới

const Header: React.FC = () => {
    return (
        <header className="fixed top-0 inset-x-0 h-14 bg-gray-900/80 backdrop-blur-md z-30 border-b border-gray-800/70">
            <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
                
                {/* Logo & Brand (Router #1, #6) */}
                <Link to="/dashboard" className="flex items-center space-x-2.5 group">
                    {/* (Logo placeholder) */}
                    <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                         <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                         </svg>
                    </div>
                    <span className="text-white font-semibold text-lg group-hover:text-blue-300 transition-colors">
                        Mindmap SaaS
                    </span>
                </Link>
                
                {/* Auth Buttons (User/Login/Register) */}
                <AuthButtons />
                
            </div>
        </header>
    );
};

export default Header;
