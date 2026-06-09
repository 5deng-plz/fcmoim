'use client';

import { useMemo } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useToastStore } from '@/stores/useToastStore';
import LockerProfile from '@/components/features/LockerProfile';
import CardMarket from '@/components/features/CardMarket';

export default function MyPage() {
  const {
    setShowMyPage,
    setShowTeamBrowse,
    teamName,
    activeClubId,
    availableClubs,
  } = useAppStore();
  const { signOut, switchClub } = useAuthStore();
  const loadActivePolls = useScheduleStore((state) => state.loadActivePolls);
  const { showToast } = useToastStore();
  const approvedClubs = useMemo(
    () => availableClubs.filter((club) => club.status === 'approved' || !club.status),
    [availableClubs],
  );

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
      <div className="mt-4">
        <CardMarket />
      </div>

      <div className="mt-auto space-y-3 px-1 pt-6 text-secondary">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
            <span className="shrink-0">소속팀</span>
            <div className="relative min-w-0">
              <select
                value={activeClubId}
                onChange={(event) => void handleClubChange(event.target.value)}
                aria-label="소속팀 선택"
                className="max-w-[150px] appearance-none truncate bg-transparent py-1 pl-0 pr-4 text-xs font-semibold text-secondary outline-none transition-colors hover:text-primary focus:text-primary"
              >
                {approvedClubs.length === 0 ? (
                  <option value={activeClubId} className="bg-surface-card text-primary">{teamName}</option>
                ) : (
                  approvedClubs.map((club) => (
                    <option key={club.clubId} value={club.clubId} className="bg-surface-card text-primary">
                      {club.clubName}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-tertiary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowTeamBrowse(true);
            }}
            className="shrink-0 rounded-full py-1 text-xs font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover active:scale-95"
          >
            다른 팀 둘러보기
          </button>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={async () => {
              await signOut();
              setShowMyPage(false);
            }}
            className="flex items-center gap-1 rounded-full py-1 text-xs font-medium text-secondary transition-colors hover:text-primary active:scale-95"
          >
            <LogOut size={12} className="text-tertiary" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
