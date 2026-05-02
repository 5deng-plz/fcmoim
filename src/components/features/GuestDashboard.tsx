'use client';

import { ClipboardList, Trophy, Users, TrendingUp, Eye } from 'lucide-react';
import FcMoimMark from '@/components/brand/FcMoimMark';
import { useAppStore } from '@/stores/useAppStore';

export default function GuestDashboard() {
  const { setAuthView, setShowJoinForm } = useAppStore();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
      {/* 상단 게스트 인디케이터 */}
      <div className="sticky top-0 z-10 bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-700">구경 중 👀</span>
        </div>
        <button
          onClick={() => setAuthView('login')}
          className="text-[11px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full hover:bg-green-200 active:scale-95 transition-all"
        >
          로그인 →
        </button>
      </div>

      {/* 스크롤 컨텐츠 */}
      <div className="p-4 space-y-6 pb-24">
        {/* 팀 소개 헤더 */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-2xl mb-2">
            <FcMoimMark size={30} />
          </div>
          <h2 className="text-lg font-black text-gray-900">FC Moim</h2>
          <p className="text-xs text-gray-400 mt-0.5">서울 · 매주 토요일 · 풋살 동호회</p>
        </div>

        {/* 팀 정보 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <Users size={16} className="text-green-600 mx-auto mb-1" />
            <span className="text-base font-black text-gray-900">-</span>
            <p className="text-[9px] text-gray-400 font-medium">회원</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <Trophy size={16} className="text-yellow-500 mx-auto mb-1" />
            <span className="text-base font-black text-gray-900">-</span>
            <p className="text-[9px] text-gray-400 font-medium">시즌</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <TrendingUp size={16} className="text-blue-500 mx-auto mb-1" />
            <span className="text-base font-black text-gray-900">-</span>
            <p className="text-[9px] text-gray-400 font-medium">경기</p>
          </div>
        </div>

        {/* 공개 기록 */}
        <section>
          <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-1.5">
            <ClipboardList size={15} className="text-yellow-500" />
            팀 기록
          </h3>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-500">
                <ClipboardList size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">공개된 기록이 없어요</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
                  시즌 결과가 저장되면 게스트도 볼 수 있는 범위의 기록이 표시됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 팀 매력 포인트 */}
        <section>
          <h3 className="text-sm font-black text-gray-900 mb-3">⚽ FC Moim은 이런 팀이에요!</h3>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <ul className="space-y-2.5 text-[13px] text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5 font-bold">✓</span>
                <span>매주 토요일 오전, 정기 풋살 경기 진행</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5 font-bold">✓</span>
                <span>위닝 일레븐 스타일 능력치 관리</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5 font-bold">✓</span>
                <span>가족적인 분위기에서 즐기는 진지한 풋살</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* 하단 고정 CTA */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8">
        <button
          onClick={() => setShowJoinForm(true)}
          className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg"
        >
          이 팀에 합류하기 ⚽
        </button>
      </div>
    </div>
  );
}
