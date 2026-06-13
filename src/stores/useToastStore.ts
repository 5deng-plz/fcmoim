'use client';

import { create } from 'zustand';

interface ToastState {
  message: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;
}

const TOAST_AUTO_DISMISS_MS = 5000;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  showToast: (msg) => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    set({ message: msg });
    toastTimeout = setTimeout(() => {
      set({ message: null });
      toastTimeout = null;
    }, TOAST_AUTO_DISMISS_MS);
  },
  hideToast: () => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }

    set({ message: null });
  },
}));
