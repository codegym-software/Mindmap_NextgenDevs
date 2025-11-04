/**
 * Layout cho các trang Public (Landing Page).
 * (File này trước đó trống)
 * Tuân thủ Router #1.
 */
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Dùng Header chung
import Spinner from '../components/Spinner/Spinner';
import Button from '../components/Button/Button';
import { Plus } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const AuthLayout: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    // Nút "Bắt đầu" (User Story #1)
    // SỬA: Dùng logic từ `BigStartButton.tsx` (code gốc)
    const handleStartClick = () => {
        // Thay vì event, chúng ta gọi `login` hoặc `Maps`
        // Tạm thời: Luôn yêu cầu đăng nhập
        login('register');
        
        // Hoặc: (Nếu cho phép guest từ landing)
        // navigate('/editor'); 
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header (Giữ nguyên UI code gốc) */}
            <Header />
            
            {/* Nội dung trang (Landing Page Hero) */}
            <main className="pt-14"> {/* pt-14 để không bị Header che */}
                <Suspense 
                    fallback={
                        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
                            <Spinner size="lg" />
                        </div>
                    }
                >
                    {/* Render trang con (LandingPage.tsx) */}
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

// Tạo file LandingPage để giữ AuthLayout sạch sẽ
// (Nhưng vì file trống, tôi sẽ đặt tạm logic Landing Page ở đây
// để tuân thủ User Story #1)
const LandingPage: React.FC = () => {
     const { login } = useAuth();

     const handleStartClick = () => {
        // Khi nhấn "Bắt đầu", mở modal đăng ký
        login('register');
     };

    return (
        <div className="flex items-center justify-center h-[calc(100vh-56px)] px-4">
             {/* Giữ nguyên UI của BigStartButton (code gốc) */}
             <Button 
                size="lg" 
                variant="gradient"
                className="text-2xl px-12 py-6 rounded-xl animate-pulse shadow-lg shadow-blue-500/30" 
                onClick={handleStartClick}
            >
                <Plus className="w-6 h-6 mr-3" strokeWidth={3}/>
                Bắt đầu tạo Mindmap
            </Button>
        </div>
    );
};

// SỬA: Export AuthLayout, nhưng router sẽ render LandingPage
export default AuthLayout;

