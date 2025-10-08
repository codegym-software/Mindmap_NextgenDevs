// src/pages/Dashboard.tsx
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import BigStartButton from "../components/dashboard/BigStartButton";
import MindmapCard from "../components/dashboard/MindmapCard";
import { useEffect } from "react";
import { useLocalMindmap } from "../hooks/useLocalMindmap";
import { useMindmapsStore, type MindmapItem } from "../app/store/useMindmapsStore";

export default function Dashboard() {
  const { createGuest, load } = useLocalMindmap();
  const { items } = useMindmapsStore();

  useEffect(() => {
    load();
    const onCreate = () => {
      createGuest();
      window.location.href = "/editor"; // guest
    };
    window.addEventListener("mm:create" as any, onCreate);
    return () => window.removeEventListener("mm:create" as any, onCreate);
  }, [createGuest, load]);

  const top7 = items.slice(0, 7);
  const rows: MindmapItem[][] = [top7.slice(0,2), top7.slice(2,5), top7.slice(5,7)];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <Header />
      <Sidebar />
      <main className="pt-16 pl-12">
        <section className="h-[45vh] border-b border-gray-700 flex items-center justify-center">
          <BigStartButton />
        </section>
        <section className="max-w-6xl mx-auto py-10">
          <div className="relative mb-6">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
            <div className="relative text-center">
              <span className="bg-gray-900 px-4 text-white/80">Hoặc bạn có thể chọn một mindmap của bạn</span>
            </div>
          </div>
          <div className="space-y-6">
            {[0,1,2].map((r) => (
              <div key={r} className={`grid gap-4 ${r===1 ? "grid-cols-3" : "grid-cols-2"} max-w-4xl mx-auto`}>
                {rows[r].map((m: MindmapItem) => <MindmapCard key={m.id} item={m} />)}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}