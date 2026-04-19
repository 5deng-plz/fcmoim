import { create } from 'zustand';

interface ScheduleState {
  selectedDate: number;
  setSelectedDate: (date: number) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedDate: 14,
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
