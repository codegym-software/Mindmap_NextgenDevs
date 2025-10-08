// src/components/common/Icon.tsx
export default function Icon({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center justify-center ${className}`}>{children}</span>;
}
