import { describe, expect, it, vi } from 'vitest';
import { createPublicClubService, type PublicClubRepositories } from '../src/services/public-clubs';
import type { TeamProfile, TeamProfileDetail } from '../src/types/domain';

const teamContext = { teamId: '00000000-0000-0000-0000-000000000001' } as const;

function createRepositories(overrides: Partial<PublicClubRepositories['clubs']> = {}): PublicClubRepositories {
  const clubSummary: TeamProfile = {
    name: 'FC Guppy',
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
  const clubDetail: TeamProfileDetail = {
    ...clubSummary,
    activeSeason: null,
    recentMatchCount: 0,
    recentMatches: [],
    upcomingMatches: [
      {
        id: 'match-1',
        title: 'Round 1',
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
      findTeamProfile: vi.fn(async (clubId: string) => clubId === teamContext.teamId ? clubDetail : null),
      ...overrides,
    },
  };
}

describe('public club service', () => {
  it('loads only the server-owned FC Guppy detail', async () => {
    const repositories = createRepositories();
    const service = createPublicClubService(repositories, teamContext);

    await expect(service.getTeam()).resolves.toMatchObject({
      upcomingMatches: [{ title: 'Round 1', attendeeCount: 0, attendeeTotal: 12 }],
    });
    expect(repositories.clubs.findTeamProfile).toHaveBeenCalledWith(teamContext.teamId);
  });

  it('rejects a missing canonical team', async () => {
    const service = createPublicClubService(
      createRepositories({ findTeamProfile: vi.fn(async () => null) }),
      teamContext,
    );

    await expect(service.getTeam()).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
