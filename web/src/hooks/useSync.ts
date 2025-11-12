// src/hooks/useSync.ts
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useLocalMindmap } from './useLocalMindmap';
import { mindmapsApi } from '../services/mindmapsApi';
import { useMindmapsStore } from '../app/store/useMindmapsStore';

// === CÁC IMPORT MỚI (Giai đoạn 4) ===
import { migrateOldGuestDataToBE } from '../services/dataMapper';
import { useToast } from './useToast';
// === KẾT THÚC IMPORT MỚI ===

const GUEST_MAP_KEY = 'mm_guest_maps';
const GUEST_DOC_KEY = 'mm_guest_docs';

export function useSync() {
  const { isAuthed } = useAuth();
  const { load, listGuests } = useLocalMindmap(); // 'load' vẫn dùng cho Guest
  const { set } = useMindmapsStore();
  const { addToast } = useToast();
  const syncedOnce = useRef(false);

  useEffect(() => {
    // 1. Nếu là Guest, chỉ cần load danh sách từ localStorage
    if (!isAuthed) {
      load();
      return;
    }

    // 2. Nếu đã Đăng nhập (isAuthed) và chưa sync lần nào
    if (isAuthed && !syncedOnce.current) {
      syncedOnce.current = true; // Đánh dấu đã chạy

      // 3. Đọc dữ liệu Guest (cũ) từ localStorage
      const guestMapsRaw = localStorage.getItem(GUEST_MAP_KEY);
      const guestDocsRaw = localStorage.getItem(GUEST_DOC_KEY);

      // Nếu không có dữ liệu Guest cũ, chỉ cần tải danh sách từ server
      if (!guestMapsRaw || !guestDocsRaw) {
        set({ loading: true });
        mindmapsApi
          .list()
          .then((serverMaps) => {
            set({ items: serverMaps, loading: false });
          })
          .catch((e) => {
            console.error('Lỗi tải danh sách (sync):', e);
            set({ loading: false, error: 'Tải thất bại' });
          });
        return; // Dừng lại
      }

      // 4. [LOGIC MỚI] Nếu có dữ liệu Guest cũ -> Di cư
      console.log('Phát hiện dữ liệu Guest cũ, bắt đầu di cư...');
      addToast('Đang đồng bộ mindmap Guest...', 'info');

      try {
        // 5. Gọi hàm di cư (từ dataMapper)
        const migratedDocs = migrateOldGuestDataToBE(guestMapsRaw, guestDocsRaw);

        if (migratedDocs.length === 0) {
          // Dữ liệu cũ rỗng, chỉ cần dọn dẹp và tải
          localStorage.removeItem(GUEST_MAP_KEY);
          localStorage.removeItem(GUEST_DOC_KEY);
          // (Tải lại danh sách server sẽ chạy trong 'finally')
          console.log('Không có dữ liệu Guest hợp lệ để di cư.');
        }

        // 6. Gọi API sync (đã cập nhật) với dữ liệu đã di cư
        mindmapsApi
          .syncGuest(migratedDocs)
          .then(() => {
            console.log('Đồng bộ Guest thành công!');
            addToast('Đồng bộ mindmap Guest thành công!', 'success');
            // Dọn dẹp localStorage sau khi sync
            localStorage.removeItem(GUEST_MAP_KEY);
            localStorage.removeItem(GUEST_DOC_KEY);
          })
          .catch((e) => {
            console.error('Lỗi đồng bộ Guest:', e);
            addToast('Lỗi khi đồng bộ mindmap Guest.', 'error');
            // Không xóa localStorage nếu lỗi, để thử lại lần sau
          })
          .finally(() => {
            // 7. Luôn tải lại danh sách cuối cùng từ server
            set({ loading: true });
            mindmapsApi.list().then((serverMaps) => {
              set({ items: serverMaps, loading: false });
            });
          });
      } catch (e) {
        console.error('Lỗi nghiêm trọng khi di cư dữ liệu:', e);
        addToast('Lỗi khi di cư dữ liệu Guest.', 'error');
        set({ loading: false });
      }
    }
  }, [isAuthed, load, set, addToast]); // 'listGuests' không còn cần thiết ở đây
}