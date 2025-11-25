// src/hooks/useLocalMindmap.ts
import { useCallback } from 'react';
import { useMindmapsStore } from '../app/store/useMindmapsStore';

// === CÁC IMPORT MỚI (Giai đoạn 3) ===
import {
  BeMindmapContent,
  normalizeContentFEtoBE,
} from '../services/dataMapper';
import { NodeData as FeNodeData } from '../app/store/useEditorStore';
// === KẾT THÚC IMPORT MỚI ===
import { v4 as uuidv4 } from 'uuid';


const KEY = 'mm_guest_maps'; // danh sách guest (dashboard)
const BUCKET = 'mm_guest_docs'; // nội dung mindmap guest (editor)

export type GuestItem = { id: string; name: string; createdAt: string };

export function useLocalMindmap() {
  const set = useMindmapsStore((s: { set: any }) => s.set);

  // Load danh sách guest vào store (Không thay đổi)
  const load = useCallback(() => {
    const raw = localStorage.getItem(KEY);
    const arr: GuestItem[] = raw ? JSON.parse(raw) : [];
    set({ items: arr });
  }, [set]);

  // List tất cả guest items (Không thay đổi)
  const listGuests = useCallback((): GuestItem[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }, []);

  /**
   * [ĐÃ CẬP NHẬT] Tạo guest mới.
   * Sửa lại để lưu 'content' theo đúng schema BE (dùng List<BeNodeData>).
   */
  const createGuest = useCallback(() => {
    const arr: GuestItem[] = listGuests();
    const id = 'guest-' + uuidv4();
    const item: GuestItem = {
      id,
      name: 'Mindmap mới',
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...arr].slice(0, 200);
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ items: next });

    // Khởi tạo doc rỗng trong BUCKET
    const docs = JSON.parse(localStorage.getItem(BUCKET) || '{}');
    if (!docs[id]) {
      // === LOGIC MỚI (Giai đoạn 3) ===
      // 1. Tạo một node root mặc định (chuẩn FE)
      const feRootNode: FeNodeData = {
        id: 'root',
        nodeText: 'Chủ đề chính',
        x: 0,
        y: 0,
        // Gán các giá trị mặc định của FE (từ useEditorStore.ts)
        shape: 'roundedRect',
        color: '#FFFFFF',
        textColor: '#4A5568',
        borderColor: '#CBD5E0',
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        textCase: 'normal',
        nodeLength: 'fit',
        localStructure: 'default',
        branchLineStyle: 'bezier',
        branchLineEnd: 'none',
        branchLineThickness: 'normal',
        quickStyleId: 'default',
      };

      // 2. Dịch nó sang chuẩn BE (dùng dataMapper)
      const beContent: BeMindmapContent = normalizeContentFEtoBE(
        [feRootNode], // Mảng node FE
        [], // Mảng edge
      );

      // 3. Lưu chuẩn BE vào localStorage
      docs[id] = {
        id,
        name: item.name,
        content: beContent, // <-- Đã chuẩn hóa BE (dùng List)
      };
      localStorage.setItem(BUCKET, JSON.stringify(docs));
      // === KẾT THÚC LOGIC MỚI ===
    }

    return item;
  }, [listGuests, set]);

  // Cập nhật tên guest (Không thay đổi)
  const updateGuestName = useCallback(
    (id: string, name: string) => {
      const arr: GuestItem[] = listGuests();
      const next = arr.map((x) => (x.id === id ? { ...x, name } : x));
      localStorage.setItem(KEY, JSON.stringify(next));
      set({ items: next });
    },
    [listGuests, set]
  );

  // Xóa guest (Không thay đổi)
  const removeGuest = useCallback(
    (id: string) => {
      // Xóa trong danh sách
      const arr: GuestItem[] = listGuests();
      const next = arr.filter((x) => x.id !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      set({ items: next });

      // Xóa nội dung trong bucket
      const docs = JSON.parse(localStorage.getItem(BUCKET) || '{}');
      if (docs[id]) {
        delete docs[id];
        localStorage.setItem(BUCKET, JSON.stringify(docs));
      }
    },
    [listGuests, set]
  );

  return {
    load,
    createGuest,
    updateGuestName,
    removeGuest,
    listGuests,
  };
}