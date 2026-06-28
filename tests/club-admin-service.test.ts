import { describe, expect, it, vi } from 'vitest';
import { createClubAdminService, type ClubAdminRepositories } from '../src/services/club-admin';

const teamContext = { teamId: '00000000-0000-0000-0000-000000000001' } as const;

function createRepositories(role: 'admin' | 'operator' | 'member' = 'operator'): ClubAdminRepositories {
  return {
    memberships: {
      findCurrentMembership: vi.fn(async () => ({ role, status: 'approved' as const })),
    },
    clubs: {
      findSettings: vi.fn(async () => ({
        id: teamContext.teamId,
        name: 'FC Guppy',
        slug: 'fc-guppy',
        description: '현재 소개',
        logoUrl: null,
        isPublic: true,
        memberCount: 0,
        activeSeason: null,
        recentMatchCount: 0,
        upcomingMatchCount: 0,
      })),
      updateSettings: vi.fn(async (input) => ({
        id: input.clubId,
        name: 'FC Guppy',
        slug: 'fc-guppy',
        description: input.description,
        logoUrl: null,
        isPublic: input.isPublic,
        memberCount: 0,
        activeSeason: null,
        recentMatchCount: 0,
        upcomingMatchCount: 0,
      })),
      updateLogo: vi.fn(async (input) => ({
        id: input.clubId,
        name: 'FC Guppy',
        slug: 'fc-guppy',
        description: '현재 소개',
        logoUrl: input.logoUrl,
        isPublic: true,
        memberCount: 0,
        activeSeason: null,
        recentMatchCount: 0,
        upcomingMatchCount: 0,
      })),
    },
  };
}

describe('club admin service', () => {
  it.each(['admin', 'operator'] as const)('allows approved %s to update club description and visibility', async (role) => {
    const repositories = createRepositories(role);
    const service = createClubAdminService(repositories, teamContext);

    await expect(service.updateClubSettings({
      auth: { user: { id: 'manager-account', email: 'manager@example.com' } },
      description: '  공개 소개  ',
      isPublic: false,
    })).resolves.toMatchObject({
      id: teamContext.teamId,
      description: '공개 소개',
      isPublic: false,
    });

    expect(repositories.clubs.updateSettings).toHaveBeenCalledWith({
      clubId: teamContext.teamId,
      description: '공개 소개',
      isPublic: false,
    });
  });

  it('denies regular members from changing club settings', async () => {
    const repositories = createRepositories('member');
    const service = createClubAdminService(repositories, teamContext);

    await expect(service.updateClubSettings({
      auth: { user: { id: 'member-account', email: 'member@example.com' } },
      description: '변경',
      isPublic: true,
    })).rejects.toMatchObject({ code: 'forbidden' });

    expect(repositories.clubs.updateSettings).not.toHaveBeenCalled();
  });

  it.each(['admin', 'operator'] as const)('allows approved %s to update club logo', async (role) => {
    const repositories = createRepositories(role);
    const service = createClubAdminService(repositories, teamContext);

    await expect(service.updateClubLogo({
      auth: { user: { id: 'manager-account', email: 'manager@example.com' } },
      logoUrl: ' https://cdn.example.com/logo.png ',
    })).resolves.toMatchObject({
      id: teamContext.teamId,
      logoUrl: 'https://cdn.example.com/logo.png',
    });

    expect(repositories.clubs.updateLogo).toHaveBeenCalledWith({
      clubId: teamContext.teamId,
      logoUrl: 'https://cdn.example.com/logo.png',
    });
  });
});
