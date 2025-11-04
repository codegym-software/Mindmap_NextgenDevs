/**
 * Entry point chính của ứng dụng.
 * Tái cấu trúc từ `main.tsx` cũ.
 * SỬA: `main.tsx` chỉ render `RouterProvider`. Logic Provider đã được chuyển vào `App.tsx`.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router'; // Import router MỚI

ReactDOM.createRoot(document.getElementById('root')!).render(
    // Không cần StrictMode ở đây nữa, vì nó đã ở trong App.tsx
    <RouterProvider
        router={router}
        // Fallback này chỉ dùng nếu router chưa load kịp
        fallbackElement={
            <div className="w-screen h-screen bg-gray-900 flex items-center justify-center text-white">
                 Đang khởi động...
            </div>
        }
    />
);

