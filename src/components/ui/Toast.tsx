'use client';

import { useToastStore } from '@/stores/useToastStore';
import { CheckCircle } from 'lucide-react';

export default function Toast() {
  const { message } = useToastStore();

  if (!message) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] animate-fadeIn">
      <div className="bg-gray-900 text-white text-sm font-bold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
        <CheckCircle size={16} className="text-green-400 shrink-0" />
        {message}
      </div>
    </div>
  );
}
