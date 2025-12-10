// src/pages/Dashboard.tsx
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import BigStartButton from "../features/dashboard/BigStartButton";
import { useEffect, useCallback } from "react"; 
import { useLocalMindmap } from "../hooks/useLocalMindmap";
import { mindmapsApi } from "../services/mindmapsApi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { useSync } from "../hooks/useSync"; 

export default function Dashboard() {
   const { createGuest } = useLocalMindmap(); 
   const { isAuthed } = useAuth();  
   const { addToast } = useToast();
    
   useSync();


   const handleCreateNew = useCallback(async () => {
     try {
       if (isAuthed) {
         const created = await mindmapsApi.createAndOpen();
         window.location.href = `/editor/${created.id}`;
       } else {
         const g = createGuest();
         window.location.href = `/editor/${g.id}`;
       }
     } catch (e) {
       console.error("Failed to create mindmap:", e);
       addToast("Không thể tạo mindmap mới", "error");
     }
   }, [isAuthed, createGuest, addToast]);

   useEffect(() => {
     const createHandler = () => handleCreateNew();
     window.addEventListener("mm:create", createHandler);
     return () => window.removeEventListener("mm:create", createHandler);
   }, [handleCreateNew]);  

   return (
     <>
       <div className="min-h-screen bg-gray-50"> 
         <Header />
         <Sidebar />
         <main className="pt-12">
           <section className="h-[calc(100vh-3rem)] flex items-center justify-center">
             <BigStartButton />
           </section>
         </main>
       </div>
     </>
   );
}