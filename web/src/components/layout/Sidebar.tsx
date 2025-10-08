// src/components/layout/Sidebar.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useMindmapsStore } from "../../app/store/useMindmapsStore";

const PIN_KEY = "mm_pin_sidebar";

export default function Sidebar() {
  const { isAuthenticated, logout } = useAuth();
  const isAuthed = isAuthenticated();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(localStorage.getItem(PIN_KEY) === "1");
  const { items } = useMindmapsStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pinned) return;
    function onLeave(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousemove", onLeave);
    return () => window.removeEventListener("mousemove", onLeave);
  }, [pinned]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    if (next) localStorage.setItem(PIN_KEY, "1"); else localStorage.removeItem(PIN_KEY);
  };

  return (
    <>
      {/* Nút 3 chấm cố định cạnh trái */}
      <button
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(v => !v)}
        className="fixed top-2 left-2 z-50 w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center"
        aria-label="Toggle sidebar"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>

      {/* Panel sidebar */}
      <aside
        ref={ref}
        onMouseEnter={() => setOpen(true)}
        className={`fixed top-0 left-0 h-screen bg-gray-900/95 text-white z-40 transition-all duration-300 ${open || pinned ? "w-64" : "w-0"} overflow-hidden border-r border-gray-700`}
      >
        <div className="h-16 flex items-center justify-between px-4" style={{ paddingLeft: 60 }}>
          <span className="font-semibold">Menu</span>
          <button onClick={togglePin} className="p-2 rounded-md hover:bg-gray-800" title={pinned ? "Bỏ ghim" : "Ghim"}>
            <svg viewBox="0 0 24 24" className={`w-5 h-5 ${pinned ? "rotate-45" : ""}`}><path d="M14 3l7 7-2 2-2-2-7 7-2-2 7-7-2-2 2-2z" /></svg>
          </button>
        </div>

        {/* P1: actions */}
        <div className="px-4 space-y-3 pb-3 border-b border-gray-700">
          <button
            onClick={() => { window.dispatchEvent(new Event("mm:create") as any); }}
            className="w-full py-3 rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Tạo mindmap mới
          </button>
          <div className="relative">
            <input className="w-full bg-gray-800 rounded-md py-2 pl-3 pr-9 outline-none placeholder:text-gray-400" placeholder="Tìm kiếm mindmap..." />
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" viewBox="0 0 24 24">
              <path d="M21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        {/* P2: recent list */}
        <div className="overflow-y-auto h-[calc(100vh-16rem)] px-2 py-3 space-y-2">
          {items.slice(0, 20).map((m) => (
            <button key={m.id} onClick={() => (window.location.href = `/editor/${m.id}`)} className="w-full text-left p-3 rounded-md bg-gray-800 hover:bg-gray-700">
              <div className="text-white font-medium overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,#000_90%,transparent)]">
                <span className="inline-block animate-[marquee_6s_linear_infinite] will-change-transform">{m.name}</span>
              </div>
              <div className="text-gray-400 text-sm">{new Date(m.createdAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>

        {/* P3: account/logout */}
        <div className="border-t border-gray-700 p-4">
          {isAuthed ? (
            <button onClick={logout} className="w-full py-2 rounded-md border border-white/30 hover:bg-gray-700/50">Đăng xuất</button>
          ) : (
            <div className="text-sm text-white/60">Chưa đăng nhập</div>
          )}
        </div>
      </aside>
    </>
  );
}