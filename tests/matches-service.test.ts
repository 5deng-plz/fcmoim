import { describe, expect, it, vi } from 'vitest';

type MembershipRole = 'admin' | 'operator' | 'member';
type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type MatchStatus = 'scheduled' | 'locker_room' | 'finished' | 'cancelled';

async function loadService(repositories: {
  memberships: {
    findByAccountAndClub: ReturnType<typeof vi.fn>;
  };
  matches: {
    listUpcoming: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
}) {
  const { createMatchService } = await import('../src/services/matches');

  return createMatchService(repositories as unknown as Parameters<typeof createMatchService>[0]);
}

function createRepositories(options?: {
  role?: MembershipRole;
  membershipStatus?: MembershipStatus;
  matchStatus?: MatchStatus;
}) {
  const membership = {
    id: 'operator-membership',
    clubId: 'club-1',
    role: options?.role ?? 'operator',
    status: options?.membershipStatus ?? 'approved',
  };
  const match = {
    id: 'match-1',
    clubId: 'club-1',
    seasonId: 'season-1',
    round: null,
    title: '3월 친선 경기',
    date: '2026-03-21T09:00:00.000Z',
    location: '서울 용산 풋살장',
    type: 'match',
    status: options?.matchStatus ?? 'scheduled',
    ourScore: null,
    oppScore: null,
    tacticsCompleted: false,
    memo: null,
    createdByMembershipId: 'operator-membership',
    cancellationReason: null,
    cancelledAt: null,
  };

  return {
    memberships: {
      findByAccountAndClub: vi.fn(async () => membership),
    },
    matches: {
      listUpcoming: vi.fn(async () => [match]),
      findById: vi.fn(async () => match),
      cancel: vi.fn(async (input) => ({
        ...match,
        status: 'cancelled',
        cancellationReason: input.cancellationReason,
        cancelledAt: '2026-03-20T10:00:00.000Z',
      })),
    },
  };
}

describe('match cancellation service', () => {
  it('allows an approved operator to cancel an upcoming match with a trimmed reason', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.cancelMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        cancellationReason: '  강설로 인한 취소  ',
      }),
    ).resolves.toMatchObject({
      id: 'match-1',
      status: 'cancelled',
      cancellationReason: '강설로 인한 취소',
    });

    expect(repositories.matches.cancel).toHaveBeenCalledWith({
      matchId: 'match-1',
      cancelledByMembershipId: 'operator-membership',
      cancellationReason: '강설로 인한 취소',
    });
  });

  it.each([
    ['member', 'approved', 'scheduled', 'forbidden'],
    ['operator', 'pending', 'scheduled', 'forbidden'],
    ['operator', 'approved', 'finished', 'conflict'],
    ['operator', 'approved', 'cancelled', 'conflict'],
  ] satisfies Array<[MembershipRole, MembershipStatus, MatchStatus, string]>)(
    'denies match cancellation for %s/%s on %s matches',
    async (role, membershipStatus, matchStatus, code) => {
      const repositories = createRepositories({ role, membershipStatus, matchStatus });
      const service = await loadService(repositories);

      await expect(
        service.cancelMatch({
          auth: {
            user: {
              id: 'operator-auth-user',
              email: 'operator@example.com',
            },
          },
          clubId: 'club-1',
          matchId: 'match-1',
          cancellationReason: '강설로 인한 취소',
        }),
      ).rejects.toMatchObject({ code });
      expect(repositories.matches.cancel).not.toHaveBeenCalled();
    },
  );

  it('requires a cancellation reason', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.cancelMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        cancellationReason: '   ',
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    expect(repositories.matches.cancel).not.toHaveBeenCalled();
  });
});
