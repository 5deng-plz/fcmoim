'use client';

import { useAppStore } from '@/stores/useAppStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import UpcomingMatch from '@/components/features/UpcomingMatch';
import SeasonStats from '@/components/features/SeasonStats';
import RecentNotice from '@/components/features/RecentNotice';
import FcmoimLogo from '@/components/brand/FcmoimLogo';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { ClipboardList, Trophy, Users, TrendingUp } from 'lucide-react';

// ─── 게스트 전용: 팀 소개 섹션 ───
function TeamIntro() {
  return (
    <section className="space-y-4">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-3">
          <FcmoimLogo size={38} />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">FC Moim</h2>
        <p className="text-sm text-gray-500">서울 · 매주 토요일 · 풋살 동호회</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <Users size={18} className="text-green-600 mx-auto mb-1" />
          <span className="text-lg font-bold text-gray-900">-</span>
          <p className="text-[10px] text-gray-500 font-medium">회원</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <Trophy size={18} className="text-award-mvp mx-auto mb-1" />
          <span className="text-lg font-bold text-gray-900">-</span>
          <p className="text-[10px] text-gray-500 font-medium">시즌</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <TrendingUp size={18} className="text-trend-down mx-auto mb-1" />
          <span className="text-lg font-bold text-gray-900">-</span>
          <p className="text-[10px] text-gray-500 font-medium">경기</p>
        </div>
      </div>
    </section>
  );
}

// ─── 게스트 전용: 지난 시즌 아카이브 ───
function PastSeasonArchive() {
  return (
    <section>
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <ClipboardList size={16} className="text-award-mvp" />
        팀 기록
      </h3>
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">공개된 기록이 없어요</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
              시즌 결과가 저장되면 게스트도 볼 수 있는 범위의 기록이 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 게스트 전용: 팀 설명 카드 ───
function TeamDescription() {
  const { setShowJoinForm } = useAppStore();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
        ⚽ FC Moim은 이런 팀이에요!
      </h3>
      <div className="bg-gray-50 rounded-xl p-5">
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>매주 토요일 오전, 정기 풋살 경기 진행</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>위닝 일레븐 스타일 능력치 관리</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>가족적인 분위기에서 즐기는 진지한 풋살</span>
          </li>
        </ul>
      </div>
      <button
        onClick={() => setShowJoinForm(true)}
        className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl text-sm hover:bg-gray-800 active:scale-[0.98] transition-all"
      >
        이 팀에 합류하기 ⚽
      </button>
    </section>
  );
}

// ─── 메인 HomeTab ───
export default function HomeTab() {
  const { activeClubId, userStatus } = useAppStore();
  const { loadActivePolls, loadUpcomingMatches } = useScheduleStore();
  const isGuest = userStatus === 'guest';

  const refreshHome = async () => {
    await Promise.allSettled([
      loadUpcomingMatches(activeClubId),
      loadActivePolls(activeClubId),
    ]);
  };

  if (isGuest) {
    return (
      <div className="space-y-7 animate-fadeIn pb-20">
        <TeamIntro />
        <PastSeasonArchive />
        <TeamDescription />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refreshHome}>
      <div className="space-y-7 animate-fadeIn pb-20">
        <UpcomingMatch />
        <SeasonStats />
        <RecentNotice />
      </div>
    </PullToRefresh>
  );
}
