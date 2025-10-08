// // src/App.tsx
// import { Routes, Route } from "react-router-dom";
// import Home from "./pages/Home";
// import Callback from "./pages/Callback";
// import Logout from "./pages/Logout";
// import Editor from "./pages/Editor";
// import Mindmaps from "./pages/Mindmaps"; // Giả sử đây là dashboard
// import ProtectedRoute from "./components/ProtectedRoute";

// export default function App() {
//   return (
//     <Routes>
//       <Route path="/" element={<Home />} />
//       <Route path="/callback" element={<Callback />} />
//       <Route path="/logout" element={<Logout />} />
//       <Route
//         path="/mindmaps"
//         element={
//           <ProtectedRoute>
//             <Mindmaps />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/editor/:id"
//         element={
//           <ProtectedRoute>
//             <Editor />
//           </ProtectedRoute>
//         }
//       />
//     </Routes>
//   );
// }
