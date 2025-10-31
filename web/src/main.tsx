// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router'; // Import router mới
import { AuthProvider } from './features/auth/providers/AuthProvider';
import { ThemeProvider } from './core/providers/ThemeProvider';
import { NotificationProvider } from './core/providers/NotificationProvider';

// Import CSS chính (Tailwind)
// (Giả sử bạn có file /src/index.css hoặc /src/styles/globals.css)
// import './styles/globals.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* (User Story #14) */}
    <ThemeProvider>
      {/* (User Story #44) */}
      <NotificationProvider>
        {/* (User Story #24-30) */}
        <AuthProvider>
          {/* (Router #1-12) */}
          <RouterProvider
            router={router}
            fallbackElement={
              <div className="w-screen h-screen bg-gray-900 flex items-center justify-center text-white">
                {/* <Spinner size="lg" /> */}
                Đang tải...
              </div>
            }
          />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
