import { createBrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Editor from "../pages/Editor";
import Callback from "../pages/Callback";
import Logout from "../pages/Logout";

export const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/editor", element: <Editor /> },        // guest editor
  { path: "/editor/:id", element: <Editor /> },    // authed editor
  { path: "/callback", element: <Callback /> },
  { path: "/logout", element: <Logout /> },
]);


