'use client';

import { Award, Target, Users, Zap } from 'lucide-react';

// ─── 시즌 총괄 통계 카드 ───
function SeasonSummaryCard() {
  const stats = [
    { label: '총 경기', value: '0', icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '팀 평균 OVR', value: '-', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '최다 득점', value: '-', icon: Target, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '최다 도움', value: '-', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '최다 출장', value: '-', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '최다 경기장', value: '-', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="card p-4">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
        시즌 요약
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center shrink-0`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
              <p className="text-sm font-black text-gray-900 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecordsTab() {
  return (
    <div className="space-y-4 animate-fadeIn pb-20">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Award size={20} className="text-yellow-500" /> 25/26 시즌 랭킹
        </h2>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="w-8 text-center">순위</div>
          <div className="flex-1 ml-2">선수</div>
          <div className="w-20 text-center">전적</div>
          <div className="w-12 text-center text-green-600">승점</div>
        </div>
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Award size={22} />
          </div>
          <p className="text-sm font-bold text-gray-700">아직 랭킹 데이터가 없어요</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
            경기 결과가 저장되면 선수별 승점과 기록이 이곳에 표시됩니다.
          </p>
        </div>
      </div>

      <SeasonSummaryCard />
    </div>
  );
}
