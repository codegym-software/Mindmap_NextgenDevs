// [MERGE] Sử dụng phiên bản "light mode" từ feature/tt
export default function Spinner({ className="" }: { className?: string }) {
  return <div className={`animate-spin w-5 h-5 border-2 border-gray-400/40 border-t-gray-700 rounded-full ${className}`} />;
}