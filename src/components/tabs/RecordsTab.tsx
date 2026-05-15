'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Coins, Gauge, Medal, MinusCircle, Target, Trophy, Users, XCircle } from 'lucide-react';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { fetchApprovedMemberships, type ApprovedMembership } from '@/stores/membershipClient';
import { useAppStore } from '@/stores/useAppStore';

type StandingRow = {
  member: ApprovedMembership;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  leaguePoints: number;
};

function SeasonSummaryCard({ rows }: { rows: StandingRow[] }) {
  const totalMatches = Math.max(...rows.map((row) => row.wins + row.draws + row.losses), 0);
  const teamAverageOvr = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.member.ovr, 0) / rows.length)
    : null;
  const topOvr = rows.reduce<ApprovedMembership | null>(
    (top, row) => (!top || row.member.ovr > top.ovr ? row.member : top),
    null,
  );
  const topMatchPoints = rows.reduce<ApprovedMembership | null>(
    (top, row) => (!top || row.member.matchPoints > top.matchPoints ? row.member : top),
    null,
  );
  const bestLeaguePoint = rows[0]?.leaguePoints ?? 0;
  const stats = [
    { label: '총 경기', value: totalMatches || '-', icon: CalendarDays, color: 'text-matchst-upcoming', bg: 'bg-matchst-upcoming/10' },
    { label: '팀 평균 OVR', value: teamAverageOvr?.toString() ?? '-', icon: Gauge, color: 'text-fcgreen-600', bg: 'bg-green-50' },
    { label: '최고 OVR', value: topOvr ? `${topOvr.nickname} ${topOvr.ovr}` : '-', icon: Trophy, color: 'text-award-mvp', bg: 'bg-award-mvp/10' },
    { label: '최고 MP', value: topMatchPoints ? topMatchPoints.nickname : '-', icon: Coins, color: 'text-tier-special', bg: 'bg-tier-special/10' },
    { label: '최고 승점', value: bestLeaguePoint || '-', icon: Medal, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '등록 선수', value: rows.length || '-', icon: Users, color: 'text-gray-500', bg: 'bg-gray-50' },
  ];

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        시즌 요약
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-gray-400">{stat.label}</p>
              <p className="truncate text-sm font-bold leading-tight text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecordsTab() {
  const { activeClubId } = useAppStore();
  const [members, setMembers] = useState<ApprovedMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const rows = useMemo(() => buildStandingRows(members), [members]);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      setMembers(await fetchApprovedMemberships(activeClubId));
    } finally {
      setIsLoading(false);
    }
  }, [activeClubId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <PullToRefresh onRefresh={loadRecords}>
      <div className="space-y-4 animate-fadeIn pb-20">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <Trophy size={20} className="text-award-mvp" /> 25/26 시즌 랭킹
          </h2>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-[34px_42px_minmax(0,1fr)_76px_44px_52px] items-center border-b border-gray-100 bg-gray-50 px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="text-center">#</div>
            <div className="text-center text-fcgreen-600">OVR</div>
            <div className="px-2">선수</div>
            <div className="text-center">승무패</div>
            <div className="text-center text-green-600">승점</div>
            <div className="text-center">승률</div>
          </div>
          {isLoading ? (
            <div className="px-4 py-10 text-center text-xs font-bold text-gray-400">랭킹을 불러오는 중입니다</div>
          ) : rows.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <div
                  key={row.member.id}
                  className="grid grid-cols-[34px_42px_minmax(0,1fr)_76px_44px_52px] items-center px-3 py-3 text-sm"
                >
                  <RankMark rank={index + 1} />
                  <div className="text-center font-extrabold text-fcgreen-600">{row.member.ovr}</div>
                  <div className="min-w-0 px-2">
                    <p className="truncate font-bold text-gray-900">{row.member.nickname}</p>
                  </div>
                  <div className="inline-flex items-center justify-center gap-1">
                    <RecordCell icon={Trophy} value={row.wins} className="text-result-win" />
                    <RecordCell icon={MinusCircle} value={row.draws} className="text-result-draw" />
                    <RecordCell icon={XCircle} value={row.losses} className="text-result-loss" />
                  </div>
                  <div className="text-center font-extrabold text-green-600">{row.leaguePoints}</div>
                  <div className="text-center font-bold text-gray-900">{row.winRate}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                <Target size={32} className="text-green-600" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-gray-900">시즌 개막 준비 중입니다.</p>
            </div>
          )}
        </div>

        <SeasonSummaryCard rows={rows} />
      </div>
    </PullToRefresh>
  );
}

function RankMark({ rank }: { rank: number }) {
  const color = rank === 1 ? 'text-tier-gold' : rank === 2 ? 'text-tier-silver' : 'text-tier-bronze';

  if (rank <= 3) {
    return (
      <span className="flex items-center justify-center" aria-label={`${rank}위`}>
        <Medal size={17} className={color} />
      </span>
    );
  }

  return <div className="text-center text-xs font-bold text-gray-500">{rank}</div>;
}

function RecordCell({ icon: Icon, value, className }: { icon: typeof Trophy; value: number; className: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-0.5 text-[11px] font-bold text-gray-600">
      <Icon size={12} className={className} />
      {value}
    </span>
  );
}

function buildStandingRows(members: ApprovedMembership[]): StandingRow[] {
  return members
    .map((member) => {
      const wins = 0;
      const draws = 0;
      const losses = 0;
      const played = wins + draws + losses;
      return {
        member,
        wins,
        draws,
        losses,
        winRate: played ? Math.round((wins / played) * 100) : 0,
        leaguePoints: wins * 3 + draws,
      };
    })
    .sort((left, right) => (
      right.winRate - left.winRate ||
      right.leaguePoints - left.leaguePoints ||
      right.member.matchPoints - left.member.matchPoints ||
      right.member.ovr - left.member.ovr ||
      left.member.nickname.localeCompare(right.member.nickname, 'ko-KR') ||
      left.member.id.localeCompare(right.member.id)
    ));
}
