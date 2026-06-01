import { AppError } from '../types/api';
import type {
  RecordsRankingRow,
  RecordsSeasonSummaryResponse,
  TeamMembershipRow,
} from '../types/domain';

type RecordsMembership = Pick<TeamMembershipRow, 'id' | 'clubId' | 'role' | 'status'>;

type RecordsApprovedMember = {
  id: string;
  nickname: string;
  photoUrl: string | null;
  ovr: number;
};

type RecordsSeason = {
  id: string;
};

type RecordsMatch = {
  id: string;
  location: string;
  ourScore: number | null;
  oppScore: number | null;
};

type RecordsAttendance = {
  matchId: string;
  membershipId: string;
};

type RecordsPlayerStat = {
  membershipId: string;
  goals: number;
  assists: number;
  isMom: boolean;
};

export type RecordsRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<RecordsMembership | null>;
    listApproved(clubId: string): Promise<RecordsApprovedMember[]>;
  };
  seasons: {
    findActiveByClub(clubId: string): Promise<RecordsSeason | null>;
  };
  matches: {
    listFinishedBySeason(clubId: string, seasonId: string): Promise<RecordsMatch[]>;
  };
  attendances: {
    listAttendingByMatchIds(matchIds: string[]): Promise<RecordsAttendance[]>;
  };
  playerStats: {
    listByMatchIds(matchIds: string[]): Promise<RecordsPlayerStat[]>;
  };
};

export function createRecordsService(repositories: RecordsRepositories) {
  return {
    async getSeasonSummary(input: { auth: { user: { id: string } }; clubId: string }): Promise<RecordsSeasonSummaryResponse> {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertApprovedMember(membership);

      const season = await repositories.seasons.findActiveByClub(input.clubId);
      const members = await repositories.memberships.listApproved(input.clubId);
      if (!season) {
        return buildEmptyResponse(null, members);
      }

      const matches = await repositories.matches.listFinishedBySeason(input.clubId, season.id);
      const matchIds = matches.map((match) => match.id);
      const [attendances, playerStats] = matchIds.length > 0
        ? await Promise.all([
            repositories.attendances.listAttendingByMatchIds(matchIds),
            repositories.playerStats.listByMatchIds(matchIds),
          ])
        : [[], []];

      return buildRecordsResponse(season.id, members, matches, attendances, playerStats);
    },
  };
}

function assertApprovedMember(membership: RecordsMembership | null): asserts membership is RecordsMembership {
  if (!membership || membership.status !== 'approved') {
    throw new AppError('membership_not_approved', '승인된 회원만 기록을 볼 수 있어요.', { status: 403 });
  }
}

function buildEmptyResponse(seasonId: string | null, members: RecordsApprovedMember[]): RecordsSeasonSummaryResponse {
  return {
    seasonId,
    rankingRows: members.map((member) => createRankingRow(member)),
    seasonSummary: {
      totalMatches: 0,
      topVenue: null,
      topAppearance: null,
      topGoals: null,
      topAssists: null,
      topMom: null,
    },
  };
}

function buildRecordsResponse(
  seasonId: string,
  members: RecordsApprovedMember[],
  matches: RecordsMatch[],
  attendances: RecordsAttendance[],
  playerStats: RecordsPlayerStat[],
): RecordsSeasonSummaryResponse {
  const rowsByMemberId = new Map(members.map((member) => [member.id, createRankingRow(member)]));
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const venueCounts = new Map<string, number>();

  for (const match of matches) {
    venueCounts.set(match.location, (venueCounts.get(match.location) ?? 0) + 1);
  }

  for (const attendance of attendances) {
    const row = rowsByMemberId.get(attendance.membershipId);
    const match = matchesById.get(attendance.matchId);
    if (!row || !match) continue;

    row.appearances += 1;
    if (match.ourScore === null || match.oppScore === null) continue;
    if (match.ourScore > match.oppScore) row.wins += 1;
    if (match.ourScore === match.oppScore) row.draws += 1;
    if (match.ourScore < match.oppScore) row.losses += 1;
  }

  for (const stat of playerStats) {
    const row = rowsByMemberId.get(stat.membershipId);
    if (!row) continue;

    row.goals += stat.goals;
    row.assists += stat.assists;
    if (stat.isMom) row.momCount += 1;
  }

  const rankingRows = Array.from(rowsByMemberId.values()).map((row) => {
    const decidedMatches = row.wins + row.draws + row.losses;
    return {
      ...row,
      winRate: decidedMatches ? Math.round((row.wins / decidedMatches) * 100) : 0,
      leaguePoints: row.wins * 3 + row.draws,
    };
  }).sort(sortRankingRows);

  return {
    seasonId,
    rankingRows,
    seasonSummary: {
      totalMatches: matches.length,
      topVenue: findTopVenue(venueCounts),
      topAppearance: findTopLeader(rankingRows, 'appearances'),
      topGoals: findTopLeader(rankingRows, 'goals'),
      topAssists: findTopLeader(rankingRows, 'assists'),
      topMom: findTopLeader(rankingRows, 'momCount'),
    },
  };
}

function createRankingRow(member: RecordsApprovedMember): RecordsRankingRow {
  return {
    membershipId: member.id,
    nickname: member.nickname,
    photoUrl: member.photoUrl,
    ovr: member.ovr,
    wins: 0,
    draws: 0,
    losses: 0,
    winRate: 0,
    leaguePoints: 0,
    goals: 0,
    assists: 0,
    momCount: 0,
    appearances: 0,
  };
}

function sortRankingRows(left: RecordsRankingRow, right: RecordsRankingRow) {
  return right.leaguePoints - left.leaguePoints ||
    right.winRate - left.winRate ||
    right.wins - left.wins ||
    left.nickname.localeCompare(right.nickname, 'ko-KR') ||
    left.membershipId.localeCompare(right.membershipId);
}

function findTopLeader(rows: RecordsRankingRow[], key: 'appearances' | 'goals' | 'assists' | 'momCount') {
  const leader = rows
    .filter((row) => row[key] > 0)
    .sort((left, right) => right[key] - left[key] || left.nickname.localeCompare(right.nickname, 'ko-KR') || left.membershipId.localeCompare(right.membershipId))[0];

  return leader ? { membershipId: leader.membershipId, nickname: leader.nickname, value: leader[key] } : null;
}

function findTopVenue(venueCounts: Map<string, number>) {
  const [location, count] = Array.from(venueCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ko-KR'))[0] ?? [];

  return location ? { location, count } : null;
}
