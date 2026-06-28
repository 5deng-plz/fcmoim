import { describe, expect, it, vi } from 'vitest';

const DEFAULT_STATS = {
  attack: 60,
  defense: 60,
  stamina: 60,
  mentality: 60,
  speed: 60,
  manner: 60,
};

type MatchResultService = {
  saveMatchResult(input: {
    auth: {
      user: {
        id: string;
        email: string;
      };
    };
    clubId: string;
    matchId: string;
    score: {
      home: number;
      away: number;
    };
    playerStats: Array<{
      membershipId: string;
      goals: number;
      assists: number;
    }>;
  }): Promise<{ matchId: string; saved: true }>;
};

type MockRepositories = {
  memberships: {
    findCurrentMembership: ReturnType<typeof vi.fn>;
    findStatsByIds: ReturnType<typeof vi.fn>;
  };
  matches: {
    findById: ReturnType<typeof vi.fn>;
  };
  lineups: {
    listForMatch: ReturnType<typeof vi.fn>;
  };
  transaction: ReturnType<typeof vi.fn>;
};

async function loadService(repositories: MockRepositories): Promise<MatchResultService> {
  const serviceModulePath = '../src/services/match-results';
  const { createMatchResultService } = await import(serviceModulePath);

  return createMatchResultService(repositories, { teamId: 'club-1' });
}

function createRepositories(overrides: Partial<MockRepositories> = {}): MockRepositories {
  const repositories = {
    memberships: {
      findCurrentMembership: vi.fn(async () => ({
        role: 'operator',
        status: 'approved',
      })),
      findStatsByIds: vi.fn(async (membershipIds: string[]) => (
        membershipIds.map((id) => ({ id, stats: DEFAULT_STATS }))
      )),
    },
    matches: {
      findById: vi.fn(async () => createMatch()),
    },
    lineups: {
      listForMatch: vi.fn(async () => [
        createLineup('player-1', 1),
        createLineup('player-2', 2),
      ]),
    },
    transaction: vi.fn(async (callback: (tx: {
      updateMatchScore: ReturnType<typeof vi.fn>;
      upsertPlayerStat: ReturnType<typeof vi.fn>;
      updateMembershipOvr: ReturnType<typeof vi.fn>;
      appendPointLedger: ReturnType<typeof vi.fn>;
    }) => Promise<unknown>) => callback({
      updateMatchScore: vi.fn(async () => undefined),
      upsertPlayerStat: vi.fn(async () => undefined),
      updateMembershipOvr: vi.fn(async () => undefined),
      appendPointLedger: vi.fn(async () => undefined),
    })),
  };

  return {
    ...repositories,
    ...overrides,
    memberships: {
      ...repositories.memberships,
      ...overrides.memberships,
    },
    matches: {
      ...repositories.matches,
      ...overrides.matches,
    },
    lineups: {
      ...repositories.lineups,
      ...overrides.lineups,
    },
  };
}

function createMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    clubId: 'club-1',
    seasonId: 'season-1',
    round: 1,
    title: 'Round 1',
    date: '2026-05-01T20:00:00.000+09:00',
    location: '잠실 풋살장',
    type: 'match',
    status: 'scheduled',
    ourScore: null,
    oppScore: null,
    tacticsCompleted: true,
    redLeaderConfirmed: true,
    blueLeaderConfirmed: true,
    memo: null,
    createdByMembershipId: 'membership-operator',
    cancellationReason: null,
    cancelledAt: null,
    updatedAt: '2026-05-01T19:00:00.000+09:00',
    ...overrides,
  };
}

function createLineup(membershipId: string, teamNumber: 1 | 2) {
  return {
    id: `lineup-${membershipId}`,
    matchId: 'match-1',
    membershipId,
    teamNumber,
    isLeader: true,
    position: 'MF',
    formationSlot: null,
    playerName: membershipId,
    playerPosition: null,
    playerOvr: 60,
    playerPhotoUrl: null,
    playerMatchPoints: 0,
  };
}

const input = {
  auth: {
    user: {
      id: 'operator-auth-user',
      email: 'operator@example.com',
    },
  },
  clubId: 'club-1',
  matchId: 'match-1',
  score: {
    home: 3,
    away: 2,
  },
  playerStats: [
    {
      membershipId: 'player-1',
      goals: 2,
      assists: 0,
    },
    {
      membershipId: 'player-2',
      goals: 1,
      assists: 1,
    },
  ],
};

describe('v1.0 match result save transaction', () => {
  it('calculates OVR and point deltas on the server before saving', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T21:00:00.000+09:00'));

    try {
      const tx = {
        updateMatchScore: vi.fn(async () => undefined),
        upsertPlayerStat: vi.fn(async () => undefined),
        updateMembershipOvr: vi.fn(async () => undefined),
        appendPointLedger: vi.fn(async () => undefined),
      };
      const repositories = createRepositories({
        transaction: vi.fn(async (callback) => callback(tx)),
      });
      const service = await loadService(repositories);

      await expect(service.saveMatchResult(input)).resolves.toEqual({
        matchId: 'match-1',
        saved: true,
      });

      expect(tx.updateMatchScore).toHaveBeenCalledWith('match-1', { home: 3, away: 2 });
      expect(tx.upsertPlayerStat).toHaveBeenCalledWith('match-1', expect.objectContaining({
        membershipId: 'player-1',
        goals: 2,
        assists: 0,
        ovrDelta: 1,
        pointDelta: 520,
      }));
      expect(tx.upsertPlayerStat).toHaveBeenCalledWith('match-1', expect.objectContaining({
        membershipId: 'player-2',
        goals: 1,
        assists: 1,
        pointDelta: 215,
      }));
      expect(tx.updateMembershipOvr).toHaveBeenCalledWith('player-1', 1);
      expect(tx.appendPointLedger).toHaveBeenCalledWith(expect.objectContaining({
        membershipId: 'player-1',
        amount: 520,
        reason: 'match_result',
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects future matches before opening a transaction', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T19:00:00.000+09:00'));

    try {
      const repositories = createRepositories();
      const service = await loadService(repositories);

      await expect(service.saveMatchResult(input)).rejects.toMatchObject({
        code: 'bad_request',
      });
      expect(repositories.transaction).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects cancelled, already finished, cross-club, duplicate, and non-lineup submissions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T21:00:00.000+09:00'));

    try {
      await expect(loadService(createRepositories({
        matches: {
          findById: vi.fn(async () => createMatch({ status: 'cancelled' })),
        },
      })).then((service) => service.saveMatchResult(input))).rejects.toMatchObject({ code: 'conflict' });

      await expect(loadService(createRepositories({
        matches: {
          findById: vi.fn(async () => createMatch({ status: 'finished' })),
        },
      })).then((service) => service.saveMatchResult(input))).rejects.toMatchObject({ code: 'conflict' });

      await expect(loadService(createRepositories({
        matches: {
          findById: vi.fn(async () => null),
        },
      })).then((service) => service.saveMatchResult(input))).rejects.toMatchObject({ code: 'not_found' });

      const service = await loadService(createRepositories());
      await expect(service.saveMatchResult({
        ...input,
        playerStats: [
          { membershipId: 'player-1', goals: 1, assists: 0 },
          { membershipId: 'player-1', goals: 0, assists: 1 },
        ],
      })).rejects.toMatchObject({ code: 'bad_request' });
      await expect(service.saveMatchResult({
        ...input,
        playerStats: [{ membershipId: 'not-in-lineup', goals: 1, assists: 0 }],
      })).rejects.toMatchObject({ code: 'bad_request' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects score totals lower than submitted team goals or assists before opening a transaction', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T21:00:00.000+09:00'));

    try {
      const repositories = createRepositories();
      const service = await loadService(repositories);

      await expect(service.saveMatchResult({
        ...input,
        score: { home: 1, away: 2 },
        playerStats: [
          { membershipId: 'player-1', goals: 2, assists: 0 },
          { membershipId: 'player-2', goals: 0, assists: 0 },
        ],
      })).rejects.toMatchObject({
        code: 'bad_request',
        message: 'Red 팀의 최종 점수(1)보다 선수의 골 수 합계(2)가 더 많을 수 없습니다.',
      });

      await expect(service.saveMatchResult({
        ...input,
        score: { home: 2, away: 1 },
        playerStats: [
          { membershipId: 'player-1', goals: 0, assists: 0 },
          { membershipId: 'player-2', goals: 0, assists: 2 },
        ],
      })).rejects.toMatchObject({
        code: 'bad_request',
        message: 'Blue 팀의 최종 점수(1)보다 선수의 도움 수 합계(2)가 더 많을 수 없습니다.',
      });

      expect(repositories.transaction).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rolls back match score, player stats, OVR, and point changes when one player update fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T21:00:00.000+09:00'));
    const tx = {
      updateMatchScore: vi.fn(async () => undefined),
      upsertPlayerStat: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(
          Object.assign(new Error('OVR update failed'), {
            code: 'ovr_update_failed',
          }),
        ),
      updateMembershipOvr: vi.fn(async () => undefined),
      appendPointLedger: vi.fn(async () => undefined),
    };
    const rollback = vi.fn(async () => undefined);
    const commit = vi.fn(async () => undefined);
    const transaction = vi.fn(async (callback) => {
      try {
        const result = await callback(tx);
        await commit();
        return result;
      } catch (error) {
        await rollback();
        throw error;
      }
    });
    const service = await loadService(createRepositories({
      transaction,
    }));

    try {
      await expect(service.saveMatchResult(input)).rejects.toMatchObject({
        code: 'match_result_not_saved',
        cause: expect.objectContaining({
          code: 'ovr_update_failed',
        }),
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(tx.updateMatchScore).toHaveBeenCalledWith('match-1', {
        home: 3,
        away: 2,
      });
      expect(tx.upsertPlayerStat).toHaveBeenCalledTimes(2);
      expect(commit).not.toHaveBeenCalled();
      expect(rollback).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
