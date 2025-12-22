import { createBrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Editor from "../pages/Editor";
import Callback from "../pages/Callback";
import Logout from "../pages/Logout";

export const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/dashboard", element: <Dashboard /> },
  
  // Editor route - quyền truy cập được kiểm tra bởi logic bên trong
  { path: "/editor", element: <Editor /> },        
  { path: "/editor/:id", element: <Editor /> },    

  { path: "/callback", element: <Callback /> },
  { path: "/logout", element: <Logout /> },
]);