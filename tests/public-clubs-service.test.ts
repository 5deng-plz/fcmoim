import { describe, expect, it, vi } from 'vitest';
import { createPublicClubService, type PublicClubRepositories } from '../src/services/public-clubs';
import type { PublicClubDetailRow, PublicClubSummaryRow } from '../src/types/domain';

function createRepositories(overrides: Partial<PublicClubRepositories['clubs']> = {}): PublicClubRepositories {
  const clubSummary: PublicClubSummaryRow = {
    id: 'club-1',
    name: 'FC Guppy',
    slug: 'fc-guppy',
    description: 'Default club',
    logoUrl: null,
    isPublic: true,
    memberCount: 12,
    activeSeason: {
      id: 'season-1',
      name: '25/26',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
    },
    recentMatchCount: 2,
    upcomingMatchCount: 1,
  };
  const clubDetail: PublicClubDetailRow = {
    ...clubSummary,
    activeSeason: null,
    recentMatchCount: 0,
    recentMatches: [],
    upcomingMatches: [
      {
        id: 'match-1',
        title: '정기전',
        date: '2026-05-09T10:00:00.000Z',
        location: 'Seoul',
        type: 'match',
        status: 'scheduled',
        ourScore: null,
        oppScore: null,
        attendeeCount: 0,
        attendeeTotal: 12,
      },
    ],
  };

  return {
    clubs: {
      listPublic: vi.fn(async () => [clubSummary]),
      findPublicDetail: vi.fn(async (clubId: string) => clubId === 'club-1' ? clubDetail : null),
      ...overrides,
    },
  };
}

describe('public club service', () => {
  it('returns public club summaries without membership identities', async () => {
    const repositories = createRepositories();
    const service = createPublicClubService(repositories);

    const clubs = await service.listClubs();

    expect(clubs).toHaveLength(1);
    expect(clubs[0]).toMatchObject({
      name: 'FC Guppy',
      memberCount: 12,
      upcomingMatchCount: 1,
    });
    expect(clubs[0]).not.toHaveProperty('members');
    expect(clubs[0]).not.toHaveProperty('pendingMembers');
  });

  it('trims clubId and loads public detail', async () => {
    const repositories = createRepositories();
    const service = createPublicClubService(repositories);

    await expect(service.getClub({ clubId: ' club-1 ' })).resolves.toMatchObject({
      id: 'club-1',
      upcomingMatches: [{ title: '정기전', attendeeCount: 0, attendeeTotal: 12 }],
    });
    expect(repositories.clubs.findPublicDetail).toHaveBeenCalledWith('club-1');
  });

  it('rejects missing or unknown clubs', async () => {
    const service = createPublicClubService(createRepositories());

    await expect(service.getClub({ clubId: ' ' })).rejects.toMatchObject({
      code: 'bad_request',
    });
    await expect(service.getClub({ clubId: 'missing-club' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
