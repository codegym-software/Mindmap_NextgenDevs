/**
 * Component Icon (wrapper).
 * Tái cấu trúc từ file cũ `components/common/Icon.tsx`.
 * GIỮ NGUYÊN GIAO DIỆN/LOGIC 100%.
 */
import React from 'react';
import { twMerge } from 'tailwind-merge';

export default function Icon({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <span className={twMerge("inline-flex items-center justify-center", className)}>{children}</span>;
}