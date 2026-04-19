'use client';

import { useState } from 'react';
import { Award, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Target, Users, Zap } from 'lucide-react';
import Image from 'next/image';
import { getDemoFace } from '@/mocks/demoMedia';
import PlayerMatchHistory from '@/components/features/PlayerMatchHistory';

const leaderboards = [
  {
    rank: 1, name: '손흥민', wdl: '8승 2무 0패', winRate: '80%', ovr: 72, pts: 26,
    ovrChange: 3, // +3 상승
    history: [
      { round: 'R7', date: '3/7', result: '승' as const, goals: 2, assists: 0, location: '서울 용산 풋살장' },
      { round: 'R6', date: '2/28', result: '승' as const, goals: 1, assists: 1, location: '광명 롯데몰 옥상경기장' },
      { round: 'R5', date: '2/21', result: '무' as const, goals: 0, assists: 0, location: '서울월드컵경기장 보조구장' },
      { round: 'R4', date: '2/14', result: '승' as const, goals: 1, assists: 0, location: '인천 유나이티드 파크' },
    ],
  },
  {
    rank: 2, name: '이강인', wdl: '7승 2무 1패', winRate: '70%', ovr: 68, pts: 23,
    ovrChange: 1,
    history: [
      { round: 'R7', date: '3/7', result: '패' as const, goals: 0, assists: 1, location: '서울 용산 풋살장' },
      { round: 'R6', date: '2/28', result: '승' as const, goals: 0, assists: 2, location: '광명 롯데몰 옥상경기장' },
      { round: 'R5', date: '2/21', result: '승' as const, goals: 1, assists: 0, location: '서울월드컵경기장 보조구장' },
    ],
  },
  {
    rank: 3, name: '김민재', wdl: '6승 4무 0패', winRate: '60%', ovr: 70, pts: 22,
    ovrChange: 0,
    history: [
      { round: 'R7', date: '3/7', result: '무' as const, goals: 0, assists: 0, location: '서울 용산 풋살장' },
      { round: 'R6', date: '2/28', result: '승' as const, goals: 0, assists: 0, location: '광명 롯데몰 옥상경기장' },
    ],
  },
  {
    rank: 4, name: '황희찬', wdl: '6승 2무 2패', winRate: '60%', ovr: 65, pts: 20,
    ovrChange: -2,
    history: [
      { round: 'R7', date: '3/7', result: '패' as const, goals: 0, assists: 0, location: '서울 용산 풋살장' },
      { round: 'R6', date: '2/28', result: '승' as const, goals: 1, assists: 0, location: '광명 롯데몰 옥상경기장' },
    ],
  },
];

function GradeTrend({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center text-[10px] text-red-500 font-bold"><TrendingUp size={10} className="mr-0.5" />{change}</span>;
  if (change < 0) return <span className="flex items-center text-[10px] text-blue-500 font-bold"><TrendingDown size={10} className="mr-0.5" />{Math.abs(change)}</span>;
  return <span className="flex items-center text-[10px] text-gray-400 font-bold"><Minus size={10} className="mr-0.5" />-</span>;
}

function RankBadge({ rank }: { rank: number }) {
  const medals = ['🥇', '🥈', '🥉'];
  if (rank <= 3) {
    return <span className="text-lg">{medals[rank - 1]}</span>;
  }
  return (
    <span className="text-gray-400 text-sm font-black">
      {rank}
    </span>
  );
}

// ─── 시즌 총괄 통계 카드 ───
function SeasonSummaryCard() {
  const stats = [
    { label: '총 경기', value: '13', icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '팀 평균 OVR', value: '68.8', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '최다 득점', value: '손흥민 (5골)', icon: Target, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '최다 도움', value: '이강인 (5A)', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '최다 출장', value: '김민재 (13)', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '최다 경기장', value: '용산 풋살장', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
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
  const [expandedRank, setExpandedRank] = useState<number | null>(null);
  const [sortType, setSortType] = useState<'pts' | 'winRate'>('pts');

  const sortedLeaderboards = [...leaderboards].sort((a, b) => {
    if (sortType === 'pts') return b.pts - a.pts;
    return parseInt(b.winRate) - parseInt(a.winRate);
  });

  return (
    <div className="space-y-4 animate-fadeIn pb-20">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Award size={20} className="text-yellow-500" /> 25/26 시즌 랭킹
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSortType('pts')}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
              sortType === 'pts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            승점순
          </button>
          <button
            onClick={() => setSortType('winRate')}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
              sortType === 'winRate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            승률순
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="w-8 text-center">순위</div>
          <div className="flex-1 ml-2">선수</div>
          <div className="w-20 text-center">전적</div>
          <div className="w-12 text-center text-green-600">
            {sortType === 'pts' ? '승점' : '승률'}
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {sortedLeaderboards.map((p, index) => (
            <div key={p.name}>
              <div
                onClick={() =>
                  setExpandedRank(expandedRank === p.rank ? null : p.rank)
                }
                className={`flex items-center px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer ${
                  index === 0 ? 'bg-gradient-to-r from-amber-50/60 to-transparent' : ''
                }`}
              >
                <div className="w-8 flex items-center justify-center">
                  <RankBadge rank={index + 1} />
                </div>
                <div className="flex-1 ml-2 flex items-center gap-2.5">
                  <Image
                    className={`rounded-full bg-gray-200 object-cover ${
                      index === 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''
                    }`}
                    src={getDemoFace(p.name)}
                    alt={p.name}
                    width={32}
                    height={32}
                    style={{ width: 32, height: 32 }}
                    unoptimized
                  />
                  <div>
                    <div className="font-bold text-gray-900 text-sm leading-tight">
                      {p.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-black text-green-600 italic leading-none">
                        OVR {p.ovr}
                      </span>
                      <GradeTrend change={p.ovrChange} />
                    </div>
                  </div>
                </div>
                <div className="w-20 text-center">
                  <div className="font-bold text-gray-700 text-xs">{p.wdl}</div>
                </div>
                <div className="w-12 text-center flex items-center justify-center gap-1">
                  <span className="font-black text-green-600 text-base">
                    {sortType === 'pts' ? p.pts : p.winRate}
                  </span>
                  {expandedRank === p.rank ? (
                    <ChevronUp size={14} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                  )}
                </div>
              </div>
              <div
                className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${
                  expandedRank === p.rank
                    ? 'max-h-[400px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                {expandedRank === p.rank && (
                  <div className="px-4 pb-4 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      매치별 기록
                    </p>
                    <PlayerMatchHistory records={p.history} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 시즌 총괄 통계 카드 */}
      <SeasonSummaryCard />
    </div>
  );
}
