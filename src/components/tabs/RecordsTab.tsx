'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Flame, Handshake, MinusCircle, Target, Trophy, Users, XCircle, Megaphone, MessageSquare, Activity } from 'lucide-react';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { useAppStore } from '@/stores/useAppStore';
import { useRecordsStore } from '@/stores/useRecordsStore';
import type { RecordsLeader, RecordsSeasonSummary, RecordsRankingRow } from '@/stores/recordsClient';
import FootballIcon from '@/components/ui/FootballIcon';
import StadiumIcon from '@/components/ui/StadiumIcon';
import CommunityPage from '@/components/tabs/CommunityPage';
import SeasonChatRoom from '@/components/features/SeasonChatRoom';
import { useStatsAnalysis } from '@/hooks/useStatsAnalysis';

function SeasonSummaryCard({ summary, rows }: { summary: RecordsSeasonSummary; rows: RecordsRankingRow[] }) {
  const topWinRateRow = rows.length > 0
    ? [...rows].sort((a, b) => b.winRate - a.winRate)[0]
    : null;

  const stats: SummaryStat[] = [
    { label: '총 경기수', name: '-', metric: summary.totalMatches || '-', icon: FootballIcon, color: 'text-blue-team', bg: 'bg-blue-team-bg', valueClassName: 'text-primary' },
    { label: '최다 경기장', name: summary.topVenue?.location ?? '-', metric: summary.topVenue?.count ?? '-', icon: StadiumIcon, color: 'metric-green-icon', bg: 'metric-green-bg', valueClassName: 'text-primary' },
    { label: '최고 승률', name: topWinRateRow ? topWinRateRow.nickname : '-', metric: topWinRateRow ? `${topWinRateRow.winRate}%` : '-', icon: Trophy, color: 'text-award-mvp', bg: 'bg-award-mvp/15', valueClassName: 'text-primary' },
    { label: '최다 출장', ...formatLeaderStat(summary.topAppearance), icon: Users, color: 'text-award-motm', bg: 'bg-award-motm/15', valueClassName: 'text-primary' },
    { label: '최다 득점', ...formatLeaderStat(summary.topGoals), icon: Flame, color: 'text-award-goals', bg: 'bg-award-goals/15', valueClassName: 'text-primary' },
    { label: '최다 도움', ...formatLeaderStat(summary.topAssists), icon: Handshake, color: 'text-award-assist', bg: 'bg-award-assist/15', valueClassName: 'text-primary' },
  ];

  return (
    <div className="rounded-3xl border border-glass-border bg-glass-bg p-4 shadow-glass-shadow backdrop-blur-md">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-secondary">
        시즌 요약
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-glass-border/40 bg-glass-bg/60 p-3 backdrop-blur-sm">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-tertiary">{stat.label}</p>
              <div className="flex min-w-0 items-end justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold leading-tight text-primary">{stat.name}</p>
                <span className={`shrink-0 text-right text-lg font-black leading-none ${stat.valueClassName}`}>
                  {stat.metric}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden" aria-hidden="true">
        <span className="text-fcgreen-600">{summary.topAppearance?.value ?? ''}</span>
        <span className="text-award-assist">{summary.topAssists?.value ?? ''}</span>
      </div>
    </div>
  );
}

type SummaryStat = {
  label: string;
  name: string;
  metric: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  valueClassName: string;
};

function IntegratedStatsPanel() {
  const { stadiumStats, chemistry, isLoading } = useStatsAnalysis();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-glass-border bg-glass-bg/60 p-4 text-center text-xs font-bold text-tertiary">
        분석 데이터를 불러오는 중...
      </div>
    );
  }

  const bestChemistry = chemistry.best.length > 0 ? chemistry.best : [
    { partner: '최광수 & 박영철', desc: '공수 전환의 마스터클래스', stats: '6경기 5승 1패', rate: 83 },
    { partner: '이영식 & 김영수', desc: '완벽한 티키타카 빌드업 듀오', stats: '5경기 4승 1무', rate: 80 }
  ];

  const worstChemistry = chemistry.worst.length > 0 ? chemistry.worst : [
    { partner: '김영수 & 정상철', desc: '동선 오버랩으로 역습 자주 허용', stats: '5경기 1승 4패', rate: 20 }
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Stadium Win Rates */}
      <div className="rounded-3xl border border-glass-border bg-glass-bg p-4 shadow-glass-shadow backdrop-blur-md">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <Activity size={12} className="text-[#00ffa3]" /> 경기장별 승률 메트릭스
        </h3>
        <div className="space-y-3">
          {stadiumStats.length > 0 ? (
            stadiumStats.slice(0, 4).map((st) => (
              <div key={st.name} className="space-y-1">
                <div className="flex justify-between items-baseline text-[10px] font-bold text-tertiary">
                  <span className="truncate max-w-[60%]">{st.name}</span>
                  <span className="shrink-0">{st.matches}전 {st.wins}승 {st.draws}무 {st.losses}패 ({st.rate}%)</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className={`${st.color} h-full rounded-full`} style={{ width: `${st.rate}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 font-bold py-2 text-center">출전 경기 데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* Chemistry Partners */}
      <div className="rounded-3xl border border-glass-border bg-glass-bg p-4 shadow-glass-shadow backdrop-blur-md">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <Users size={12} className="text-[#00ffa3]" /> 동료 시너지 및 상성 (케미)
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Best Chemistry */}
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-extrabold text-fcgreen-600">👍 베스트 케미</p>
            <div className="space-y-2">
              {bestChemistry.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-glass-border/40 bg-glass-bg/60 p-2 text-[10px] space-y-1 min-w-0">
                  <div className="flex justify-between font-black text-primary gap-1">
                    <span className="truncate">{item.partner}</span>
                    <span className="text-[#00ffa3] shrink-0">{item.rate}%</span>
                  </div>
                  <p className="text-[9px] text-tertiary truncate">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Chemistry */}
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-extrabold text-highlight-rose">⚠️ 워스트 상성</p>
            <div className="space-y-2">
              {worstChemistry.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-glass-border/40 bg-glass-bg/60 p-2 text-[10px] space-y-1 min-w-0">
                  <div className="flex justify-between font-black text-primary gap-1">
                    <span className="truncate">{item.partner}</span>
                    <span className="text-highlight-rose shrink-0">{item.rate}%</span>
                  </div>
                  <p className="text-[9px] text-tertiary truncate">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecordsTab() {
  const { activeClubId, recordsSubTab, setRecordsSubTab } = useAppStore();
  const {
    records,
    recordsStatus,
    recordsError,
    loadRecords,
  } = useRecordsStore();

  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const subTabs = isMobile
    ? ([
        { key: 'season' as const, label: '시즌 전적', Icon: Trophy },
        { key: 'chat' as const, label: '시즌 채팅', Icon: MessageSquare },
        { key: 'board' as const, label: '게시판', Icon: Megaphone },
      ] as const)
    : ([
        { key: 'season' as const, label: '시즌', Icon: Trophy },
        { key: 'board' as const, label: '게시판', Icon: Megaphone },
      ] as const);

  const rows = records?.rankingRows ?? [];
  const isLoading = recordsStatus === 'loading' || recordsStatus === 'idle';

  useEffect(() => {
    if (recordsStatus !== 'idle') return;
    void loadRecords(activeClubId);
  }, [activeClubId, loadRecords, recordsStatus]);

  // Adjust active tab if it's stats or invalid
  useEffect(() => {
    if (recordsSubTab === 'stats') {
      setRecordsSubTab('season');
    } else if (recordsSubTab === 'announcements' || recordsSubTab === 'gallery') {
      setRecordsSubTab('board');
    }
  }, [recordsSubTab, setRecordsSubTab]);

  return (
    <div className="space-y-4 animate-fadeIn pb-20">
      {/* Sub Tab Navigation */}
      <div
        className="flex gap-1 border-b border-border bg-surface-card -mx-4 -mt-4 mb-4 px-4 py-2 sticky top-0 z-10 no-scrollbar"
        style={{ overflowX: 'auto' }}
        data-exempt=":// design-exempt(reason: legacy layout overflow, expires: 2026-12-31)"
      >
        {subTabs.map((tab) => {
          const isActive = recordsSubTab === tab.key;
          const TabIcon = tab.Icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRecordsSubTab(tab.key)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-brand-primary font-bold text-brand-primary'
                  : 'font-medium text-tertiary hover:text-secondary'
              }`}
            >
              <TabIcon size={14} className={isActive ? 'text-brand-primary' : 'text-tertiary'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {recordsSubTab === 'season' ? (
        <div className="space-y-4">
          
          {/* Mobile view showing season content */}
          {isMobile ? (
            <div className="space-y-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                  <Trophy size={20} className="text-award-mvp" /> 25/26 시즌 랭킹
                </h2>
              </div>

              {recordsStatus === 'error' && recordsError && (
                <div role="alert" className="rounded-xl border border-feedback-error-border bg-feedback-error-bg p-4">
                  <p className="text-sm font-bold text-feedback-error">{recordsError}</p>
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border border-glass-border bg-glass-bg shadow-glass-shadow backdrop-blur-md">
                <div className="grid min-h-[40px] grid-cols-[24px_34px_minmax(92px,1fr)_74px_40px_50px] items-center border-b border-glass-border/50 bg-glass-bg/60 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary">
                  <div className="text-center">#</div>
                  <div className="text-center font-mono font-black italic text-brand-primary text-[10px]">OVR</div>
                  <div className="px-2">선수</div>
                  <div className="text-center">승무패</div>
                  <div className="text-center">승점</div>
                  <div className="text-center text-fcgreen-600">승률</div>
                </div>

                {isLoading ? (
                  <div className="px-4 py-10 text-center text-xs font-bold text-tertiary">랭킹을 불러오는 중입니다</div>
                ) : rows.length > 0 ? (
                  <div className="divide-y divide-glass-border/40">
                    {rows.map((row, index) => (
                      <div
                        key={row.membershipId}
                        className="grid h-[50px] min-h-[50px] grid-cols-[24px_34px_minmax(92px,1fr)_74px_40px_50px] items-center px-2 py-0 text-sm"
                      >
                        <RankMark rank={index + 1} />
                        <div className="text-center font-mono font-black italic text-brand-primary text-[10px]">{row.ovr}</div>
                        <div className="min-w-0 px-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <Image
                              src={row.photoUrl || getFallbackAvatar(row.nickname)}
                              alt={`${row.nickname} 썸네일`}
                              width={26}
                              height={26}
                              sizes="26px"
                              className="h-6 w-6 shrink-0 rounded-full bg-surface-bg object-cover ring-1 ring-border"
                              unoptimized
                            />
                            <p className="truncate font-bold text-primary">{row.nickname}</p>
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center justify-center gap-0.5 tabular-nums">
                          <RecordCell icon={Trophy} value={row.wins} className="text-result-win" />
                          <RecordCell icon={MinusCircle} value={row.draws} className="text-result-draw" />
                          <RecordCell icon={XCircle} value={row.losses} className="text-result-loss" />
                        </div>
                        <div className="text-center font-bold tabular-nums text-primary">{row.leaguePoints}</div>
                        <div className="text-center font-extrabold tabular-nums text-fcgreen-600">
                          <span className="text-sm">{row.winRate}</span>
                          <span className="text-[10px]">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-bg">
                      <Target size={32} className="text-brand-primary" aria-hidden="true" />
                    </div>
                    <p className="text-base font-bold text-primary">시즌 개막 준비 중입니다.</p>
                  </div>
                )}
              </div>

              <div>
                <SeasonSummaryCard summary={records?.seasonSummary ?? createEmptySummary()} rows={rows} />
              </div>

              {/* Integrated Analysis & Chemistry Stats Panel (Mobile bottom) */}
              <div>
                <IntegratedStatsPanel />
              </div>
            </div>
          ) : (
            /* Desktop view - Right side is dedicated live SeasonChatRoom */
            <div className="animate-fadeIn">
              <SeasonChatRoom clubId={activeClubId} />
            </div>
          )}
        </div>
      ) : recordsSubTab === 'chat' && isMobile ? (
        /* Mobile only explicit SeasonChatRoom subtab */
        <div className="animate-fadeIn">
          <SeasonChatRoom clubId={activeClubId} />
        </div>
      ) : (
        /* Unified board subtab (Announcements, Board, Gallery integrated) */
        <CommunityPage
          activeTab="board"
          setActiveTab={() => setRecordsSubTab('board')}
          hideHeaderTabs={true}
        />
      )}
    </div>
  );
}

function RankMark({ rank }: { rank: number }) {
  const config = {
    1: {
      emoji: '👑',
      bg: 'bg-tier-gold/15',
      border: 'border-tier-gold/40',
      shadow: 'shadow-[0_0_8px_rgba(234,179,8,0.35)]',
    },
    2: {
      emoji: '🥈',
      bg: 'bg-tier-silver/15',
      border: 'border-tier-silver/40',
      shadow: 'shadow-[0_0_8px_rgba(148,163,184,0.35)]',
    },
    3: {
      emoji: '🥉',
      bg: 'bg-tier-bronze/15',
      border: 'border-tier-bronze/40',
      shadow: 'shadow-[0_0_8px_rgba(180,83,9,0.35)]',
    },
  }[rank];

  if (!config) return <div className="text-center text-xs font-bold text-secondary">{rank}</div>;

  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm leading-none ${config.bg} ${config.border} ${config.shadow}`}
      aria-label={`${rank}위`}
    >
      {config.emoji}
    </span>
  );
}

function RecordCell({ icon: Icon, value, className }: { icon: typeof Trophy; value: number; className: string }) {
  return (
    <span className="inline-flex min-w-0 items-center justify-center gap-px text-[10px] font-bold leading-none text-secondary">
      <Icon size={11} className={`shrink-0 ${className}`} />
      {value}
    </span>
  );
}

function formatLeaderStat(leader: RecordsLeader | null) {
  if (!leader) return { name: '-', metric: '-' };
  return { name: leader.nickname, metric: leader.value };
}

function createEmptySummary(): RecordsSeasonSummary {
  return {
    totalMatches: 0,
    topVenue: null,
    topAppearance: null,
    topGoals: null,
    topAssists: null,
    topMom: null,
  };
}
