'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRecordsStore } from '@/stores/useRecordsStore';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetchCalendarMatches, fetchMatchLineup, type UpcomingMatch, type MatchLineupEntry } from '@/stores/matchClient';

export interface StadiumStat {
  name: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  rate: number;
  color: string;
}

export interface ChemistryInfo {
  partner: string;
  desc: string;
  rate: number;
  stats: string;
}

export function useStatsAnalysis() {
  const { records, recordsStatus, loadRecords } = useRecordsStore();
  const { activeClubId } = useAppStore();
  const memberProfile = useAuthStore((state) => state.memberProfile);

  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchLineupsMap, setMatchLineupsMap] = useState<Record<string, MatchLineupEntry[]>>({});
  const [isLoadingLineups, setIsLoadingLineups] = useState(false);

  const myMembershipId = memberProfile?.id;
  const rows = records?.rankingRows ?? [];

  useEffect(() => {
    if (recordsStatus === 'idle') {
      void loadRecords(activeClubId);
    }
  }, [activeClubId, loadRecords, recordsStatus]);

  // Load matches
  useEffect(() => {
    if (!activeClubId) return;
    let isActive = true;
    setIsLoadingMatches(true);

    const currentYear = new Date().getFullYear();
    const fromStr = `${currentYear}-01-01`;
    const toStr = `${currentYear + 1}-01-01`;

    fetchCalendarMatches({ clubId: activeClubId, from: fromStr, to: toStr })
      .then((data) => {
        if (!isActive) return;
        const finished = data
          .filter((m) => m.status === 'finished' || (m.ourScore !== null && m.oppScore !== null))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMatches(finished);
      })
      .catch((err) => {
        console.error('[FC Moim] useStatsAnalysis: Load match history failed:', err);
      })
      .finally(() => {
        if (isActive) setIsLoadingMatches(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeClubId]);

  // Load lineups
  useEffect(() => {
    if (matches.length === 0) return;
    let isActive = true;
    setIsLoadingLineups(true);

    const loadLineups = async () => {
      try {
        const lineupPromises = matches.map(async (m) => {
          const lineup = await fetchMatchLineup({ clubId: activeClubId, matchId: m.id });
          return {
            matchId: m.id,
            lineup,
          };
        });

        const results = await Promise.all(lineupPromises);
        if (!isActive) return;

        const map: Record<string, MatchLineupEntry[]> = {};
        for (const res of results) {
          map[res.matchId] = res.lineup;
        }
        setMatchLineupsMap(map);
      } catch (err) {
        console.error('[FC Moim] useStatsAnalysis: Load match lineups failed:', err);
      } finally {
        if (isActive) setIsLoadingLineups(false);
      }
    };

    void loadLineups();
    return () => {
      isActive = false;
    };
  }, [matches, activeClubId]);

  // 1. Stadium win rates
  const stadiumStats = useMemo<StadiumStat[]>(() => {
    if (!myMembershipId) return [];

    const stadiumMap: Record<string, { name: string; matches: number; wins: number; draws: number; losses: number; rate: number }> = {};

    for (const match of matches) {
      if (match.ourScore === null || match.oppScore === null) continue;
      const lineup = matchLineupsMap[match.id] ?? [];
      const myEntry = lineup.find((e) => e.membershipId === myMembershipId);
      if (!myEntry) continue; // Didn't participate

      const loc = match.location;
      if (!stadiumMap[loc]) {
        stadiumMap[loc] = { name: loc, matches: 0, wins: 0, draws: 0, losses: 0, rate: 0 };
      }

      const stat = stadiumMap[loc];
      stat.matches += 1;

      const isWin = match.ourScore > match.oppScore;
      const isDraw = match.ourScore === match.oppScore;

      if (isDraw) {
        stat.draws += 1;
      } else {
        const isTeam1 = myEntry.teamNumber === 1;
        const isMyWin = isWin ? isTeam1 : !isTeam1;
        if (isMyWin) stat.wins += 1;
        else stat.losses += 1;
      }
    }

    return Object.values(stadiumMap)
      .map((st) => {
        const decided = st.wins + st.losses + st.draws;
        const rate = decided ? Math.round((st.wins / decided) * 100) : 0;
        const color =
          rate >= 75
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            : rate >= 50
            ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
            : rate >= 30
            ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
            : 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.5)]';
        return {
          ...st,
          rate,
          color,
        };
      })
      .sort((a, b) => b.rate - a.rate || b.matches - a.matches);
  }, [matches, matchLineupsMap, myMembershipId]);

  // 2. Chemistry stats
  const chemistry = useMemo(() => {
    if (!myMembershipId || rows.length === 0) return { best: [], worst: [] };

    const partnerStats: Array<{
      nickname: string;
      matches: number;
      wins: number;
      losses: number;
      draws: number;
      rate: number;
    }> = [];

    for (const player of rows) {
      if (player.membershipId === myMembershipId) continue; // Exclude self

      let coMatches = 0;
      let coWins = 0;
      let coLosses = 0;
      let coDraws = 0;

      for (const match of matches) {
        if (match.ourScore === null || match.oppScore === null) continue;
        const lineup = matchLineupsMap[match.id] ?? [];

        const myEntry = lineup.find((e) => e.membershipId === myMembershipId);
        const partnerEntry = lineup.find((e) => e.membershipId === player.membershipId);

        if (!myEntry || !partnerEntry) continue;

        // Played in the same team
        if (myEntry.teamNumber === partnerEntry.teamNumber) {
          coMatches += 1;
          const isWin = match.ourScore > match.oppScore;
          const isDraw = match.ourScore === match.oppScore;

          if (isDraw) {
            coDraws += 1;
          } else {
            const isTeam1 = myEntry.teamNumber === 1;
            const isMyWin = isWin ? isTeam1 : !isTeam1;
            if (isMyWin) coWins += 1;
            else coLosses += 1;
          }
        }
      }

      if (coMatches > 0) {
        partnerStats.push({
          nickname: player.nickname,
          matches: coMatches,
          wins: coWins,
          losses: coLosses,
          draws: coDraws,
          rate: Math.round((coWins / coMatches) * 100),
        });
      }
    }

    const sortedBest = [...partnerStats].sort((a, b) => b.rate - a.rate || b.matches - a.matches);
    const sortedWorst = [...partnerStats].sort((a, b) => a.rate - b.rate || a.matches - b.matches);

    const bestCandidates = sortedBest.filter((p) => p.rate >= 50);
    const worstCandidates = sortedWorst.filter((p) => p.rate < 50);

    const bestDescs = [
      '완벽한 티키타카 빌드업 듀오 ⚽',
      '공수 전환의 마스터클래스 ⚡',
      '눈빛만 봐도 통하는 연계 시너지 🔥',
    ];

    const worstDescs = [
      '동선 오버랩으로 역습 자주 허용 ⚠️',
      '패스 미스 빌드업 불안 요소 노출 📉',
      '공격 템포 조율 어긋남 발생 🧩',
    ];

    const best = bestCandidates.slice(0, 3).map((item, idx) => ({
      partner: item.nickname,
      desc: bestDescs[idx % bestDescs.length],
      rate: item.rate,
      stats: `${item.matches}경기 ${item.wins}승 ${item.losses}패`,
    }));

    const worst = worstCandidates.slice(0, 3).map((item, idx) => ({
      partner: item.nickname,
      desc: worstDescs[idx % worstDescs.length],
      rate: item.rate,
      stats: `${item.matches}경기 ${item.wins}승 ${item.losses}패`,
    }));

    return { best, worst };
  }, [rows, matches, matchLineupsMap, myMembershipId]);

  // 3. Player Match Matrix Stats
  const playerMatrixStats = useMemo(() => {
    const stats: Record<string, { wins: number; losses: number; draws: number; winRate: number }> = {};

    for (const player of rows) {
      let wins = 0;
      let losses = 0;
      let draws = 0;

      for (const match of matches) {
        if (match.ourScore === null || match.oppScore === null) continue;
        const lineup = matchLineupsMap[match.id] ?? [];
        const entry = lineup.find((e) => e.membershipId === player.membershipId);
        if (!entry) continue;

        const isWin = match.ourScore > match.oppScore;
        const isDraw = match.ourScore === match.oppScore;

        if (isDraw) {
          draws += 1;
        } else {
          const isTeam1 = entry.teamNumber === 1;
          if (isWin) {
            if (isTeam1) wins += 1;
            else losses += 1;
          } else {
            if (isTeam1) losses += 1;
            else wins += 1;
          }
        }
      }

      const total = wins + losses + draws;
      const winRate = total ? Math.round((wins / total) * 100) : 0;
      stats[player.membershipId] = { wins, losses, draws, winRate };
    }

    return stats;
  }, [rows, matches, matchLineupsMap]);

  return {
    stadiumStats,
    chemistry,
    playerMatrixStats,
    matches,
    matchLineupsMap,
    isLoading: isLoadingMatches || isLoadingLineups || recordsStatus === 'loading',
  };
}
