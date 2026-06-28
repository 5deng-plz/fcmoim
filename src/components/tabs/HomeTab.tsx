'use client';

import { useAppStore } from '@/stores/useAppStore';
import UpcomingMatch from '@/components/features/UpcomingMatch';
import SeasonStats from '@/components/features/SeasonStats';
import RecentNotice from '@/components/features/RecentNotice';
import TeamEmblem from '@/components/brand/TeamEmblem';
import { ClipboardList, Trophy, Users, TrendingUp } from 'lucide-react';

// ─── 게스트 전용: 팀 소개 섹션 ───
function TeamIntro() {
  return (
    <section className="space-y-4">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-2xl border border-white/10 mb-3 shadow-sm">
          <TeamEmblem teamName="FC Guppy" size={48} />
        </div>
        <h2 className="text-xl font-extrabold text-primary mb-1">FC Guppy</h2>
        <p className="text-sm text-secondary">서울 · 매주 토요일 · 풋살 동호회</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-card rounded-xl p-3 text-center">
          <Users size={18} className="text-green-600 mx-auto mb-1" />
          <span className="text-lg font-bold text-primary">-</span>
          <p className="text-[10px] text-secondary font-medium">회원</p>
        </div>
        <div className="bg-surface-card rounded-xl p-3 text-center">
          <Trophy size={18} className="text-award-mvp mx-auto mb-1" />
          <span className="text-lg font-bold text-primary">-</span>
          <p className="text-[10px] text-secondary font-medium">시즌</p>
        </div>
        <div className="bg-surface-card rounded-xl p-3 text-center">
          <TrendingUp size={18} className="text-trend-down mx-auto mb-1" />
          <span className="text-lg font-bold text-primary">-</span>
          <p className="text-[10px] text-secondary font-medium">경기</p>
        </div>
      </div>
    </section>
  );
}

// ─── 게스트 전용: 지난 시즌 아카이브 ───
function PastSeasonArchive() {
  return (
    <section>
      <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5">
        <ClipboardList size={16} className="text-award-mvp" />
        팀 기록
      </h3>
      <div className="bg-surface-card rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-bg text-tertiary">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">공개된 기록이 없어요</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-tertiary">
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
      <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
        ⚽ FC Guppy는 이런 팀이에요!
      </h3>
      <div className="bg-surface-bg rounded-xl p-5">
        <ul className="space-y-2 text-sm text-secondary">
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
        className="w-full bg-action-secondary text-background font-semibold py-4 rounded-xl text-sm hover:bg-action-secondary-hover active:scale-[0.98] transition-all"
      >
        이 팀에 합류하기 ⚽
      </button>
    </section>
  );
}

// ─── 메인 HomeTab ───
export default function HomeTab() {
  const { userStatus } = useAppStore();
  const isGuest = userStatus === 'guest';

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
    <div className="space-y-7 animate-fadeIn pb-20">
      <UpcomingMatch />
      <SeasonStats />
      <RecentNotice />
    </div>
  );
}
