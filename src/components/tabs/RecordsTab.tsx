'use client';

import { Award, Target, Users, Zap } from 'lucide-react';

function SeasonSummaryCard() {
  const stats = [
    { label: '총 경기', value: '-', icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '팀 평균 OVR', value: '-', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '최다 득점', value: '-', icon: Target, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '최다 도움', value: '-', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '최다 출장', value: '-', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '최다 경기장', value: '-', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        시즌 요약
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400">{stat.label}</p>
              <p className="text-sm font-black leading-tight text-gray-900">{stat.value}</p>
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
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
          <Award size={20} className="text-yellow-500" /> 25/26 시즌 랭킹
        </h2>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center border-b border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <div className="w-8 text-center">순위</div>
          <div className="ml-2 flex-1">선수</div>
          <div className="w-20 text-center">전적</div>
          <div className="w-12 text-center text-green-600">승점</div>
        </div>
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
            <SeasonKickoffIllustration />
          </div>
          <p className="text-base font-black text-gray-900">시즌 개막 준비 중입니다.</p>
        </div>
      </div>

      <SeasonSummaryCard />
    </div>
  );
}

function SeasonKickoffIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="9" y="18" width="46" height="28" rx="12" fill="#E0F2FE" />
      <path d="M13 46h38" stroke="#86EFAC" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 42V29c0-3.314 2.686-6 6-6h18c3.314 0 6 2.686 6 6v13" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M23 29h18" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="47" cy="22" r="6" fill="#FACC15" />
      <path d="M47 18.5v7M43.5 22h7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
