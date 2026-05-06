import { create } from 'zustand';

interface MembersState {
  expandedMemberId: number | null;
  toggleMember: (id: number) => void;
}

export const useMembersStore = create<MembersState>((set) => ({
  expandedMemberId: null,
  toggleMember: (id) =>
    set((state) => ({
      expandedMemberId: state.expandedMemberId === id ? null : id,
    })),
}));
