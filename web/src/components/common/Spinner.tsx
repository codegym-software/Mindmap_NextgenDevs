export default function Spinner({ className="" }: { className?: string }) {
  return <div className={`animate-spin w-5 h-5 border-2 border-white/40 border-t-white rounded-full ${className}`} />;
}
