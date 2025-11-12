// src/pages/Dashboard.tsx
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import BigStartButton from '../features/dashboard/BigStartButton';
import { useEffect, useCallback } from 'react';
import { useLocalMindmap } from '../hooks/useLocalMindmap';
import { mindmapsApi } from '../services/mindmapsApi'; // [FIX] Import mindmapsApi
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useSync } from '../hooks/useSync';
// [FIX] Import các type cần thiết
import { BeMindmapDoc } from '../services/dataMapper';
import { loadGuestDoc } from '../pages/Editor'; // Import hàm load từ Editor

export default function Dashboard() {
  const { createGuest } = useLocalMindmap();
  const { isAuthed } = useAuth();
  const { addToast } = useToast();

  useSync();

  /**
   * [ĐÃ CẬP NHẬT] Logic tạo mới
   *
   * Giờ đây sẽ lưu kết quả vào sessionStorage để trang Editor
   * đọc ngay lập tức, tránh race condition khi Tải (load).
   */
  const handleCreateNew = useCallback(async () => {
    try {
      if (isAuthed) {
        // 1. Gọi API tạo (POST), BE trả về document đầy đủ
        const createdDoc: BeMindmapDoc = await mindmapsApi.createAndOpen();

        // 2. [FIX] Lưu document (chuẩn BE) vào sessionStorage
        // Editor.tsx sẽ đọc từ đây thay vì gọi GET
        sessionStorage.setItem('temp_mindmap', JSON.stringify(createdDoc));

        // 3. Chuyển trang
        window.location.href = `/editor/${createdDoc.id}`;
      } else {
        // 1. Logic Guest: createGuest() tạo doc trong localStorage
        const g = createGuest();

        // 2. [FIX] Đọc ngay doc vừa tạo từ localStorage
        // (loadGuestDoc trả về chuẩn FeMindmapDoc, ta chỉ cần id và name)
        const guestDoc = loadGuestDoc(g.id);

        // 3. [FIX] Lưu tạm doc (chuẩn FE) vào sessionStorage
        // (Editor.tsx sẽ đọc từ đây thay vì đọc localStorage)
        sessionStorage.setItem('temp_mindmap_guest', JSON.stringify(guestDoc));

        // 4. Chuyển trang
        window.location.href = `/editor/${g.id}`;
      }
    } catch (e) {
      console.error('Failed to create mindmap:', e);
      addToast('Không thể tạo mindmap mới', 'error');
    }
  }, [isAuthed, createGuest, addToast]);

  useEffect(() => {
    const createHandler = () => handleCreateNew();
    window.addEventListener('mm:create', createHandler);
    return () => window.removeEventListener('mm:create', createHandler);
  }, [handleCreateNew]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <Header />
        <Sidebar />
        <main className="pt-16">
          <section className="h-[calc(100vh-4rem)] flex items-center justify-center">
            <BigStartButton />
          </section>
        </main>
      </div>
    </>
  );
}