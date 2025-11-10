import { useEffect, useRef, useState, useCallback } from "react";
import { FileDown, Upload, ImageDown } from "lucide-react";

type FileMenuProps = {
  onImport?: () => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  className?: string;
};

export default function FileMenu({
  onImport,
  onExportPNG,
  onExportPDF,
  className = "",
}: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => setOpen(v => !v), []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const fallback = (label: string) => () => console.log(`[FileMenu] ${label} clicked`);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        title="Import / Export"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-xl bg-white/70 hover:bg-gray-100 shadow-sm px-3 py-2 text-gray-800"
      >
        <FileDown size={18} />
        <span className="text-sm font-medium">File</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute mt-2 min-w-[200px] right-0 z-50 rounded-xl bg-white/90 backdrop-blur shadow-lg ring-1 ring-black/5 p-1"
        >
          <MenuItem
            icon={<Upload size={16} />}
            label="Import (.json)"
            onClick={() => {
              (onImport || fallback("onImport"))();
              setOpen(false);
            }}
          />
          <MenuItem
            icon={<ImageDown size={16} />}
            label="Export as PNG"
            onClick={() => {
              (onExportPNG || fallback("onExportPNG"))();
              setOpen(false);
            }}
          />
          <MenuItem
            icon={<FileDown size={16} />}
            label="Export as PDF"
            onClick={() => {
              (onExportPDF || fallback("onExportPDF"))();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
    >
      <span className="text-gray-600">{icon}</span>
      <span>{label}</span>
    </button>
  );
}


