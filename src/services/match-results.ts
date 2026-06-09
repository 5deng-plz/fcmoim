import { AppError } from '../types/api';
import type { AuthContext, MatchLineupEntryRow, MatchRow, TeamMembershipRow } from '../types/domain';
import { applyPerformanceBoost, calculateOVR } from '../utils/ovr';

type ScoreInput = {
  home: number;
  away: number;
};

type PlayerResultInput = {
  membershipId: string;
  goals: number;
  assists: number;
};

type SettledPlayerStat = PlayerResultInput & {
  membershipId: string;
  goals: number;
  assists: number;
  ovrDelta: number;
  pointDelta: number;
};

type MatchResultTransaction = {
  updateMatchScore(matchId: string, score: ScoreInput): Promise<void>;
  upsertPlayerStat(matchId: string, stat: SettledPlayerStat): Promise<void>;
  updateMembershipOvr(membershipId: string, delta: number): Promise<void>;
  appendPointLedger(input: {
    membershipId: string;
    amount: number;
    reason: string;
    sourceType: 'match_result';
    sourceId: string;
  }): Promise<void>;
};

export type MatchResultRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<Pick<TeamMembershipRow, 'role' | 'status'> | null>;
    findStatsByIds(membershipIds: string[]): Promise<Array<Pick<TeamMembershipRow, 'id' | 'stats'>>>;
  };
  matches: {
    findById(matchId: string): Promise<MatchRow | null>;
  };
  lineups: {
    listForMatch(matchId: string): Promise<MatchLineupEntryRow[]>;
  };
  transaction<T>(callback: (tx: MatchResultTransaction) => Promise<T>): Promise<T>;
};

export function createMatchResultService(repositories: MatchResultRepositories) {
  return {
    async saveMatchResult(input: {
      auth: AuthContext;
      clubId: string;
      matchId: string;
      score: ScoreInput;
      playerStats: PlayerResultInput[];
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        input.clubId,
      );
      assertCanSaveMatchResult(membership);
      const score = normalizeScore(input.score);
      const submittedStats = normalizePlayerResultInputs(input.playerStats);
      const match = await repositories.matches.findById(input.matchId);
      assertMatchCanReceiveResult(match, input.clubId);
      const lineup = await repositories.lineups.listForMatch(input.matchId);
      assertPlayerStatsMatchScore({
        score,
        lineup,
        submittedStats,
      });
      const settledStats = await settlePlayerStats({
        lineup,
        score,
        submittedStats,
        loadMembershipStats: repositories.memberships.findStatsByIds,
      });

      try {
        await repositories.transaction(async (tx) => {
          await tx.updateMatchScore(input.matchId, score);

          for (const stat of settledStats) {
            await tx.upsertPlayerStat(input.matchId, stat);
            await tx.updateMembershipOvr(stat.membershipId, stat.ovrDelta);
            await tx.appendPointLedger({
              membershipId: stat.membershipId,
              amount: stat.pointDelta,
              reason: 'match_result',
              sourceType: 'match_result',
              sourceId: input.matchId,
            });
          }
        });
      } catch (error) {
        throw new AppError('match_result_not_saved', 'Match result was not saved.', {
          cause: error,
        });
      }

      return { matchId: input.matchId, saved: true as const };
    },
  };
}

function normalizeScore(score: ScoreInput): ScoreInput {
  return {
    home: normalizeCount(score?.home, 'home score'),
    away: normalizeCount(score?.away, 'away score'),
  };
}

function normalizePlayerResultInputs(playerStats: PlayerResultInput[]) {
  if (!Array.isArray(playerStats)) {
    throw new AppError('bad_request', 'Player stats must be an array.');
  }

  const seen = new Set<string>();
  return playerStats.map((stat) => {
    const membershipId = typeof stat?.membershipId === 'string' ? stat.membershipId.trim() : '';
    if (!membershipId) {
      throw new AppError('bad_request', 'Player stat membershipId is required.');
    }
    if (seen.has(membershipId)) {
      throw new AppError('bad_request', 'Duplicate player stat membershipId is not allowed.');
    }
    seen.add(membershipId);

    return {
      membershipId,
      goals: normalizeCount(stat.goals, 'goals'),
      assists: normalizeCount(stat.assists, 'assists'),
    };
  });
}

function normalizeCount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99) {
    throw new AppError('bad_request', `${label} must be an integer between 0 and 99.`);
  }

  return value;
}

function assertMatchCanReceiveResult(match: MatchRow | null, clubId: string): asserts match is MatchRow {
  if (!match || match.clubId !== clubId) {
    throw new AppError('not_found', 'Match was not found for this club.');
  }
  if (match.status === 'cancelled') {
    throw new AppError('conflict', '취소된 경기는 경기 종료 처리를 할 수 없습니다.');
  }
  if (match.status === 'finished') {
    throw new AppError('conflict', '이미 종료 처리된 경기입니다.');
  }
  if (new Date(match.date).getTime() > Date.now()) {
    throw new AppError('bad_request', '경기가 시작되기 전에는 경기 종료 처리를 할 수 없습니다.');
  }
}

function assertPlayerStatsMatchScore(input: {
  score: ScoreInput;
  lineup: MatchLineupEntryRow[];
  submittedStats: PlayerResultInput[];
}) {
  const lineupByMembershipId = new Map(input.lineup.map((entry) => [entry.membershipId, entry]));
  const totals = {
    red: { goals: 0, assists: 0 },
    blue: { goals: 0, assists: 0 },
  };

  for (const stat of input.submittedStats) {
    const lineupEntry = lineupByMembershipId.get(stat.membershipId);
    if (!lineupEntry) continue;
    const teamTotals = lineupEntry.teamNumber === 1 ? totals.red : totals.blue;
    teamTotals.goals += stat.goals;
    teamTotals.assists += stat.assists;
  }

  assertTeamStatTotal('Red', '골', input.score.home, totals.red.goals);
  assertTeamStatTotal('Red', '도움', input.score.home, totals.red.assists);
  assertTeamStatTotal('Blue', '골', input.score.away, totals.blue.goals);
  assertTeamStatTotal('Blue', '도움', input.score.away, totals.blue.assists);
}

function assertTeamStatTotal(teamLabel: 'Red' | 'Blue', statLabel: '골' | '도움', score: number, total: number) {
  if (total > score) {
    throw new AppError(
      'bad_request',
      `${teamLabel} 팀의 최종 점수(${score})보다 선수의 ${statLabel} 수 합계(${total})가 더 많을 수 없습니다.`,
    );
  }
}

async function settlePlayerStats(input: {
  lineup: MatchLineupEntryRow[];
  score: ScoreInput;
  submittedStats: PlayerResultInput[];
  loadMembershipStats: MatchResultRepositories['memberships']['findStatsByIds'];
}): Promise<SettledPlayerStat[]> {
  if (input.lineup.length === 0) {
    throw new AppError('bad_request', 'Lineup is required before saving a match result.');
  }

  const lineupByMembershipId = new Map(input.lineup.map((entry) => [entry.membershipId, entry]));
  for (const stat of input.submittedStats) {
    if (!lineupByMembershipId.has(stat.membershipId)) {
      throw new AppError('bad_request', 'Player stat membershipId is not in the match lineup.');
    }
  }

  const statsByMembershipId = new Map(
    (await input.loadMembershipStats(input.lineup.map((entry) => entry.membershipId))).map((membership) => [
      membership.id,
      membership.stats,
    ]),
  );
  const submittedByMembershipId = new Map(input.submittedStats.map((stat) => [stat.membershipId, stat]));

  return input.lineup.map((entry) => {
    const submitted = submittedByMembershipId.get(entry.membershipId);
    const goals = submitted?.goals ?? 0;
    const assists = submitted?.assists ?? 0;
    const currentStats = statsByMembershipId.get(entry.membershipId);
    if (!currentStats) {
      throw new AppError('bad_request', 'Lineup player membership stats were not found.');
    }
    const result = getTeamResult(input.score, entry.teamNumber);
    const newStats = applyPerformanceBoost(currentStats, {
      goals,
      assists,
      isMom: false,
      result,
    });

    return {
      membershipId: entry.membershipId,
      goals,
      assists,
      ovrDelta: calculateOVR(newStats) - calculateOVR(currentStats),
      pointDelta: calculatePointDelta({ goals, assists, isMom: false, result }),
    };
  });
}

function getTeamResult(score: ScoreInput, teamNumber: 1 | 2) {
  if (score.home === score.away) return 'draw' as const;
  const homeWon = score.home > score.away;
  return (teamNumber === 1 ? homeWon : !homeWon) ? 'win' as const : 'loss' as const;
}

function calculatePointDelta(input: {
  goals: number;
  assists: number;
  isMom: boolean;
  result: 'win' | 'draw' | 'loss';
}) {
  return 200
    + (input.result === 'win' ? 300 : input.result === 'draw' ? 100 : 0)
    + (input.isMom ? 50 : 0)
    + input.goals * 10
    + input.assists * 5;
}

function assertCanSaveMatchResult(membership: Pick<TeamMembershipRow, 'role' | 'status'> | null) {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can save match results.');
  }
}
