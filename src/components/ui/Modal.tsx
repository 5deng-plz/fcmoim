'use client';

import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 animate-fadeIn"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[400px] bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col animate-slideUp z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 active:scale-90 transition-all"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
