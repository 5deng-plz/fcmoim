'use client';

import { useToastStore } from '@/stores/useToastStore';
import { CheckCircle } from 'lucide-react';

export default function Toast() {
  const { message } = useToastStore();

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(var(--bottom-nav-height,72px)+12px)] left-1/2 z-[60] w-[calc(100%-32px)] max-w-[360px] -translate-x-1/2 animate-slideUp motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-black text-primary shadow-xl glass-lvl3">
        <CheckCircle size={16} className="text-green-600 dark:text-green-400 shrink-0" />
        {message}
      </div>
    </div>
  );
}
