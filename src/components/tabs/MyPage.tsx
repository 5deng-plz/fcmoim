'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useToastStore } from '@/stores/useToastStore';
import LockerProfile from '@/components/features/LockerProfile';

export default function MyPage() {
  const {
    setShowMyPage,
    teamName,
    activeClubId,
    availableClubs,
  } = useAppStore();
  const { signOut, switchClub } = useAuthStore();
  const loadActivePolls = useScheduleStore((state) => state.loadActivePolls);
  const { showToast } = useToastStore();

  const handleClubChange = async (clubId: string) => {
    try {
      await switchClub(clubId);
      await loadActivePolls(clubId).catch(() => {
        // Header/team context should still update even if the poll refresh fails.
      });
    } catch (error) {
      console.error('[FC Moim] Club switch failed:', error);
      showToast('소속 팀을 바꾸지 못했어요.');
    }
  };

  return (
    <div className="flex min-h-full flex-col animate-fadeIn pb-2">
      <LockerProfile />

      <div className="mt-auto flex items-center justify-between gap-3 px-1 pt-6 text-gray-400">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <span className="shrink-0">소속팀</span>
          <div className="relative min-w-0">
            <select
              value={activeClubId}
              onChange={(event) => void handleClubChange(event.target.value)}
              aria-label="소속팀 선택"
              className="max-w-[150px] appearance-none truncate bg-transparent py-1 pl-0 pr-4 text-xs font-semibold text-gray-500 outline-none transition-colors hover:text-gray-600 focus:text-gray-700"
            >
              {availableClubs.length === 0 ? (
                <option value={activeClubId}>{teamName}</option>
              ) : (
                availableClubs.map((club) => (
                  <option key={club.clubId} value={club.clubId}>
                    {club.clubName}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-gray-300"
            />
          </div>
        </div>

        <button
          onClick={async () => {
            await signOut();
            setShowMyPage(false);
          }}
          className="flex items-center gap-1 rounded-full py-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 active:scale-95"
        >
          <LogOut size={12} className="text-gray-300" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
