import { createBrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Editor from "../pages/Editor";
import Callback from "../pages/Callback";
import Logout from "../pages/Logout";

export const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/dashboard", element: <Dashboard /> },
  
  // Editor chính (Có thể sửa nếu có quyền)
  { path: "/editor", element: <Editor /> },        
  { path: "/editor/:id", element: <Editor /> },    
  
  // [MỚI] Route Share (Luôn luôn Read-only)
  { path: "/share/:id", element: <Editor mode="share" /> }, 

  { path: "/callback", element: <Callback /> },
  { path: "/logout", element: <Logout /> },
]);