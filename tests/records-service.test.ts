import { describe, expect, it, vi } from 'vitest';
import type { RecordsRepositories } from '../src/services/records';

async function loadService(repositories: RecordsRepositories) {
  const { createRecordsService } = await import('../src/services/records');

  return createRecordsService(repositories);
}

describe('records season summary service', () => {
  it('sorts rankings by points, win rate, and wins while building the six summary stats', async () => {
    const repositories: RecordsRepositories = {
      memberships: {
        findByAccountAndClub: vi.fn(async () => ({
          id: 'member-admin',
          clubId: 'club-1',
          role: 'admin' as const,
          status: 'approved' as const,
        })),
        listApproved: vi.fn(async () => [
          { id: 'member-1', nickname: '가가', photoUrl: '/avatars/ga.png', ovr: 70 },
          { id: 'member-2', nickname: '나나', photoUrl: null, ovr: 68 },
          { id: 'member-3', nickname: '다다', photoUrl: '/avatars/da.png', ovr: 66 },
        ]),
      },
      seasons: {
        findActiveByClub: vi.fn(async () => ({ id: 'season-1' })),
      },
      matches: {
        listFinishedBySeason: vi.fn(async () => [
          { id: 'match-1', location: 'A구장', ourScore: 2, oppScore: 1 },
          { id: 'match-2', location: 'A구장', ourScore: 1, oppScore: 1 },
          { id: 'match-3', location: 'B구장', ourScore: 0, oppScore: 1 },
        ]),
      },
      attendances: {
        listAttendingByMatchIds: vi.fn(async () => [
          { matchId: 'match-1', membershipId: 'member-1' },
          { matchId: 'match-2', membershipId: 'member-1' },
          { matchId: 'match-1', membershipId: 'member-2' },
          { matchId: 'match-3', membershipId: 'member-2' },
          { matchId: 'match-1', membershipId: 'member-3' },
        ]),
      },
      playerStats: {
        listByMatchIds: vi.fn(async () => [
          { membershipId: 'member-1', goals: 2, assists: 1, isMom: true },
          { membershipId: 'member-2', goals: 1, assists: 3, isMom: false },
          { membershipId: 'member-3', goals: 0, assists: 0, isMom: false },
        ]),
      },
    };
    const service = await loadService(repositories);

    const summary = await service.getSeasonSummary({
      auth: { user: { id: 'auth-admin' } },
      clubId: 'club-1',
    });

    expect(summary.rankingRows.map((row) => row.membershipId)).toEqual(['member-1', 'member-3', 'member-2']);
    expect(summary.rankingRows[0]).toMatchObject({
      wins: 1,
      draws: 1,
      losses: 0,
      leaguePoints: 4,
      winRate: 50,
      photoUrl: '/avatars/ga.png',
      appearances: 2,
      goals: 2,
      assists: 1,
      momCount: 1,
    });
    expect(summary.seasonSummary).toEqual({
      totalMatches: 3,
      topVenue: { location: 'A구장', count: 2 },
      topAppearance: { membershipId: 'member-1', nickname: '가가', value: 2 },
      topGoals: { membershipId: 'member-1', nickname: '가가', value: 2 },
      topAssists: { membershipId: 'member-2', nickname: '나나', value: 3 },
      topMom: { membershipId: 'member-1', nickname: '가가', value: 1 },
    });
  });
});
