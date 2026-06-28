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
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
            <span className="shrink-0 text-gray-500">소속 클럽</span>
            <span className="truncate text-gray-900 font-black">{teamName || 'FC Guppy'}</span>
          </div>
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
