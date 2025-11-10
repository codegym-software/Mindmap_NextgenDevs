// LogoutButton.tsx
import { useAuthStore } from '../../app/store/authStore';

export const LogoutButton = () => {
  const { logout, isLoading } = useAuthStore();

  return (
    <button onClick={() => logout()} disabled={isLoading}>
      {isLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
    </button>
  );
};