import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { AuthProvider } from "./app/providers/AuthProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider 
          router={router} 
          future={{ v7_startTransition: true }}
        />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
