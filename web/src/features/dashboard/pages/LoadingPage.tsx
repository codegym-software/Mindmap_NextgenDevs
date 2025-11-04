/**
 * Trang chủ Landing Page (Router #1).
 * (File này trước đó bị thiếu).
 * Nhiệm vụ: Hiển thị BigStartButton.
 */
import React from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import BigStartButton from '../components/BigStartButton';

const LandingPage: React.FC = () => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleStart = () => {
        // User Story #1, #36: Bắt đầu -> Mở modal đăng ký
        setIsLoading(true);
        // (Giả sử `login` sẽ mất 1 chút thời gian để mở modal)
        login('register');
        // Không cần tắt loading, vì modal sẽ che
    };

    return (
        // Sử dụng UI gốc của BigStartButton
        <BigStartButton onClick={handleStart} isLoading={isLoading} />
    );
};

export default LandingPage;
