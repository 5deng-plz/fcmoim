import { describe, expect, it, vi } from 'vitest';

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
      ovrDelta: number;
      pointDelta: number;
    }>;
  }): Promise<{ matchId: string; saved: true }>;
};

async function loadService(repositories: {
  memberships: {
    findByAccountAndClub: ReturnType<typeof vi.fn>;
  };
  transaction: ReturnType<typeof vi.fn>;
}): Promise<MatchResultService> {
  const serviceModulePath = '../src/services/match-results';
  const { createMatchResultService } = await import(serviceModulePath);

  return createMatchResultService(repositories);
}

describe('Stage 1 match result save transaction', () => {
  it('rolls back match score, player stats, OVR, and point changes when one player update fails', async () => {
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
    const service = await loadService({
      memberships: {
        findByAccountAndClub: vi.fn(async () => ({
          id: 'approved-operator-membership',
          accountId: 'operator-auth-user',
          clubId: 'club-1',
          role: 'operator',
          status: 'approved',
        })),
      },
      transaction,
    });

    await expect(
      service.saveMatchResult({
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
            ovrDelta: 1,
            pointDelta: 10,
          },
          {
            membershipId: 'player-2',
            goals: 1,
            assists: 1,
            ovrDelta: 2,
            pointDelta: 10,
          },
        ],
      }),
    ).rejects.toMatchObject({
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
  });
});
