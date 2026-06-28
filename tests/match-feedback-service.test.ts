import { describe, expect, it, vi } from 'vitest';

const openDeadline = '2026-06-23T00:00:00.000Z';
const closedDeadline = '2026-06-21T00:00:00.000Z';

async function loadService(repositories = createRepositories()) {
  const { createMatchFeedbackService } = await import('../src/services/match-feedback');
  return createMatchFeedbackService(repositories, { teamId: 'club-1' });
}

function createRepositories(options?: {
  feedbackDeadline?: string | null;
}) {
  const match = {
    id: 'match-1',
    clubId: 'club-1',
    seasonId: 'season-1',
    round: 1,
    title: 'Round 1',
    date: '2026-06-21T20:00:00.000+09:00',
    location: '잠실 풋살장',
    type: 'match' as const,
    status: 'finished' as const,
    ourScore: 3,
    oppScore: 2,
    tacticsCompleted: true,
    redLeaderConfirmed: true,
    blueLeaderConfirmed: true,
    memo: null,
    createdByMembershipId: 'operator-membership',
    cancellationReason: null,
    cancelledAt: null,
    updatedAt: '2026-06-21T22:00:00.000+09:00',
    feedbackDeadline: options?.feedbackDeadline ?? openDeadline,
  };

  return {
    memberships: {
      findCurrentMembership: vi.fn(async () => ({
        id: 'member-1',
        clubId: 'club-1',
        role: 'member' as const,
        status: 'approved' as const,
      })),
    },
    matches: {
      findById: vi.fn(async () => match),
    },
    participants: {
      listForMatch: vi.fn(async () => [
        { membershipId: 'member-1', playerName: '춘향', playerPhotoUrl: null, playerOvr: 70 },
        { membershipId: 'member-2', playerName: '몽룡', playerPhotoUrl: null, playerOvr: 73 },
        { membershipId: 'member-3', playerName: '향단', playerPhotoUrl: null, playerOvr: 66 },
      ]),
    },
    feedback: {
      listMvpVotes: vi.fn(async () => []),
      listPeerRatings: vi.fn(async () => []),
      upsertMvpVote: vi.fn(async () => undefined),
      upsertPeerRatings: vi.fn(async () => undefined),
      settle: vi.fn(async () => undefined),
    },
  };
}

const auth = {
  user: {
    id: 'auth-user-1',
    email: 'member@example.com',
  },
};

describe('match feedback service', () => {
  it('upserts MVP votes so revoting updates the existing vote', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T00:00:00.000Z'));

    try {
      const repositories = createRepositories();
      const service = await loadService(repositories);

      await expect(service.voteMvp({
        auth,
        matchId: 'match-1',
        candidateMembershipId: 'member-2',
      })).resolves.toEqual({
        matchId: 'match-1',
        candidateMembershipId: 'member-2',
        saved: true,
      });

      expect(repositories.feedback.upsertMvpVote).toHaveBeenCalledWith({
        matchId: 'match-1',
        voterMembershipId: 'member-1',
        candidateMembershipId: 'member-2',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects MVP votes after the feedback deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T00:00:00.000Z'));

    try {
      const repositories = createRepositories({ feedbackDeadline: closedDeadline });
      const service = await loadService(repositories);

      await expect(service.voteMvp({
        auth,
        matchId: 'match-1',
        candidateMembershipId: 'member-2',
      })).rejects.toMatchObject({
        code: 'conflict',
      });
      expect(repositories.feedback.upsertMvpVote).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects peer self ratings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T00:00:00.000Z'));

    try {
      const repositories = createRepositories();
      const service = await loadService(repositories);

      await expect(service.submitPeerRatings({
        auth,
        matchId: 'match-1',
        ratings: [{ rateeMembershipId: 'member-1', rating: 8, badges: [] }],
      })).rejects.toMatchObject({
        code: 'bad_request',
      });
      expect(repositories.feedback.upsertPeerRatings).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('settles MVP, average ratings, and participation points lazily on closed feedback reads', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T00:00:00.000Z'));

    try {
      const repositories = createRepositories({ feedbackDeadline: closedDeadline });
      repositories.feedback.listMvpVotes.mockResolvedValueOnce([
        { voterMembershipId: 'member-1', candidateMembershipId: 'member-2' },
        { voterMembershipId: 'member-3', candidateMembershipId: 'member-2' },
      ] as Awaited<ReturnType<typeof repositories.feedback.listMvpVotes>>);
      repositories.feedback.listPeerRatings.mockResolvedValueOnce([
        { raterMembershipId: 'member-1', rateeMembershipId: 'member-2', rating: 8, badges: ['pass_master'] },
        { raterMembershipId: 'member-3', rateeMembershipId: 'member-2', rating: 9, badges: ['pass_master'] },
      ] as Awaited<ReturnType<typeof repositories.feedback.listPeerRatings>>);
      const service = await loadService(repositories);

      await expect(service.getFeedback({
        auth,
        matchId: 'match-1',
      })).resolves.toMatchObject({
        status: 'closed',
        results: {
          mvpMembershipId: 'member-2',
          ratingAverages: [
            {
              membershipId: 'member-2',
              averageRating: 8.5,
              ratingCount: 2,
              topBadges: ['pass_master'],
            },
          ],
        },
      });

      expect(repositories.feedback.settle).toHaveBeenCalledWith({
        matchId: 'match-1',
        winnerMembershipId: 'member-2',
        ratingAverages: [{ membershipId: 'member-2', averageRating: 8.5 }],
        participationMembershipIds: ['member-1', 'member-3'],
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
