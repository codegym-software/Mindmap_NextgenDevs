/**
 * Layout chính cho các trang yêu cầu đăng nhập (Dashboard, Editor).
 * Tích hợp Header, Sidebar và nội dung chính (Outlet).
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar'; // Giả định Sidebar đã được tái cấu trúc

const MainLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header cố định */}
            <Header />
            
            {/* Sidebar (từ GĐ2, file core/layouts/Sidebar.tsx) */}
            {/* <Sidebar /> */}
            
            {/* Nội dung chính (DashboardPage hoặc EditorPage) */}
            {/* pt-14 để không bị Header che mất */}
            <main className="pt-14"> 
                {/* Sidebar trong EditorPage (StylePanel) sẽ là absolute.
                  Sidebar trong Dashboard (MainLayout) sẽ là fixed/absolute.
                  Vì vậy, chúng ta render Sidebar *bên trong* MainLayout
                  để nó có mặt ở cả Dashboard và Editor.
                  
                  CHỈNH SỬA: Dựa trên UX, Sidebar chỉ nên xuất hiện ở Dashboard.
                  EditorPage sẽ có layout toàn màn hình riêng (Full-bleed).
                  
                  QUYẾT ĐỊNH: MainLayout này chỉ render Header.
                  Trang Dashboard sẽ render Sidebar + Content.
                  Trang Editor sẽ render UI của riêng nó.
                */}
                 <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
