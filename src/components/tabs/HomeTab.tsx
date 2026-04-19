'use client';

import { useAppStore } from '@/stores/useAppStore';
import UpcomingMatch from '@/components/features/UpcomingMatch';
import SeasonStats from '@/components/features/SeasonStats';
import RecentNotice from '@/components/features/RecentNotice';
import FcMoimMark from '@/components/brand/FcMoimMark';
import { Trophy, Users, TrendingUp } from 'lucide-react';

// ─── 게스트 전용: 팀 소개 섹션 ───
function TeamIntro() {
  return (
    <section className="space-y-4">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-3">
          <FcMoimMark size={34} />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-1">FC Moim</h2>
        <p className="text-sm text-gray-500">서울 · 매주 토요일 · 풋살 동호회</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <Users size={18} className="text-green-600 mx-auto mb-1" />
          <span className="text-lg font-black text-gray-900">24</span>
          <p className="text-[10px] text-gray-500 font-medium">회원</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <Trophy size={18} className="text-yellow-500 mx-auto mb-1" />
          <span className="text-lg font-black text-gray-900">3</span>
          <p className="text-[10px] text-gray-500 font-medium">시즌</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <TrendingUp size={18} className="text-blue-500 mx-auto mb-1" />
          <span className="text-lg font-black text-gray-900">42</span>
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
      <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-1.5">
        <Trophy size={16} className="text-yellow-500" />
        지난 시즌 기록
      </h3>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900">24/25 시즌</span>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">완료</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-lg font-black text-gray-900">18</span>
              <p className="text-[10px] text-gray-400">총 경기</p>
            </div>
            <div>
              <span className="text-lg font-black text-green-600">12</span>
              <p className="text-[10px] text-gray-400">승리</p>
            </div>
            <div>
              <span className="text-lg font-black text-gray-900">67%</span>
              <p className="text-[10px] text-gray-400">승률</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 mb-2">시즌 MVP</p>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-bold text-gray-900">손흥민</span>
            <span className="text-[10px] font-black text-green-600 italic leading-none ml-1.5 translate-y-[1px] inline-block">
              OVR 72 · MOM 6회
            </span>
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
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
        ⚽ FC Moim은 이런 팀이에요!
      </h3>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
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
        className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-gray-800 active:scale-[0.98] transition-all"
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
