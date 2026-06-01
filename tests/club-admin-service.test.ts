import { describe, expect, it, vi } from 'vitest';
import { createClubAdminService, type ClubAdminRepositories } from '../src/services/club-admin';

function createRepositories(role: 'admin' | 'operator' | 'member' = 'operator'): ClubAdminRepositories {
  return {
    memberships: {
      findByAccountAndClub: vi.fn(async () => ({ role, status: 'approved' as const })),
    },
    clubs: {
      findSettings: vi.fn(async () => ({
        id: 'club-1',
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
    },
  };
}

describe('club admin service', () => {
  it.each(['admin', 'operator'] as const)('allows approved %s to update club description and visibility', async (role) => {
    const repositories = createRepositories(role);
    const service = createClubAdminService(repositories);

    await expect(service.updateClubSettings({
      auth: { user: { id: 'manager-account', email: 'manager@example.com' } },
      clubId: ' club-1 ',
      description: '  공개 소개  ',
      isPublic: false,
    })).resolves.toMatchObject({
      id: 'club-1',
      description: '공개 소개',
      isPublic: false,
    });

    expect(repositories.clubs.updateSettings).toHaveBeenCalledWith({
      clubId: 'club-1',
      description: '공개 소개',
      isPublic: false,
    });
  });

  it('denies regular members from changing club settings', async () => {
    const repositories = createRepositories('member');
    const service = createClubAdminService(repositories);

    await expect(service.updateClubSettings({
      auth: { user: { id: 'member-account', email: 'member@example.com' } },
      clubId: 'club-1',
      description: '변경',
      isPublic: true,
    })).rejects.toMatchObject({ code: 'forbidden' });

    expect(repositories.clubs.updateSettings).not.toHaveBeenCalled();
  });
});
