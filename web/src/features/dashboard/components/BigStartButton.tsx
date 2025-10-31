// src/features/dashboard/components/BigStartButton.tsx
/**
 * Nút "Tạo Mindmap Mới" nổi bật trên Dashboard.
 * Tuân thủ User Story #1.
 * Tái cấu trúc từ file cũ.
 */
import React from 'react';
import Button from "../../../core/components/Button/Button";
import { Plus } from 'lucide-react';
import { useMindmapsStore } from '../store/useMindmapsStore';

const BigStartButton: React.FC = () => {
    const isLoading = useMindmapsStore(state => state.loading);

    const handleCreate = () => {
        // Gửi event global để DashboardPage hoặc Sidebar xử lý
        // (Vì logic auth nằm ở đó)
        window.dispatchEvent(new CustomEvent("mm:create"));
    };

    return (
        <div className="text-center p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
                Bắt đầu hành trình của bạn
            </h2>
            <p className="text-lg text-gray-400 mb-8 max-w-lg mx-auto">
                Không có mindmap nào. Hãy tạo cái đầu tiên để biến ý tưởng của bạn thành hành động.
            </p>
            <Button
                size="lg"
                className="!text-lg !px-8 !py-4 shadow-lg shadow-blue-500/30 animate-pulse-slow"
                onClick={handleCreate}
                isLoading={isLoading} // Sử dụng isLoading từ store
            >
                <Plus size={22} className="-ml-1 mr-2" />
                Tạo Mindmap Mới
            </Button>
        </div>
    );
};

export default BigStartButton;
