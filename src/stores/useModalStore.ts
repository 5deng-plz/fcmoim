'use client';

import { create } from 'zustand';

type ModalType = 'matchCreate' | 'pollCreate' | 'announcementCreate' | null;

interface ModalState {
  activeModal: ModalType;
  openModal: (type: ModalType) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  openModal: (type) => set({ activeModal: type }),
  closeModal: () => set({ activeModal: null }),
}));
