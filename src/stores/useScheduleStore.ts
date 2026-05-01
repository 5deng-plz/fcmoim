import { create } from 'zustand';

interface ScheduleState {
  selectedDate: number;
  setSelectedDate: (date: number) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedDate: new Date().getDate(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
