import { AppError } from '../types/api';
import type { AuthContext, TeamMembershipRow } from '../types/domain';

type ScoreInput = {
  home: number;
  away: number;
};

type PlayerStatInput = {
  membershipId: string;
  goals: number;
  assists: number;
  ovrDelta: number;
  pointDelta: number;
};

type MatchResultTransaction = {
  updateMatchScore(matchId: string, score: ScoreInput): Promise<void>;
  upsertPlayerStat(matchId: string, stat: PlayerStatInput): Promise<void>;
  updateMembershipOvr(membershipId: string, delta: number): Promise<void>;
  appendPointLedger(input: {
    membershipId: string;
    amount: number;
    reason: string;
    sourceType: 'match_result';
    sourceId: string;
  }): Promise<void>;
};

export type MatchResultRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<Pick<TeamMembershipRow, 'role' | 'status'> | null>;
  };
  transaction<T>(callback: (tx: MatchResultTransaction) => Promise<T>): Promise<T>;
};

export function createMatchResultService(repositories: MatchResultRepositories) {
  return {
    async saveMatchResult(input: {
      auth: AuthContext;
      clubId: string;
      matchId: string;
      score: ScoreInput;
      playerStats: PlayerStatInput[];
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        input.clubId,
      );
      assertCanSaveMatchResult(membership);

      try {
        await repositories.transaction(async (tx) => {
          await tx.updateMatchScore(input.matchId, input.score);

          for (const stat of input.playerStats) {
            await tx.upsertPlayerStat(input.matchId, stat);
            await tx.updateMembershipOvr(stat.membershipId, stat.ovrDelta);
            await tx.appendPointLedger({
              membershipId: stat.membershipId,
              amount: stat.pointDelta,
              reason: 'match_result',
              sourceType: 'match_result',
              sourceId: input.matchId,
            });
          }
        });
      } catch (error) {
        throw new AppError('match_result_not_saved', 'Match result was not saved.', {
          cause: error,
        });
      }

      return { matchId: input.matchId, saved: true as const };
    },
  };
}

function assertCanSaveMatchResult(membership: Pick<TeamMembershipRow, 'role' | 'status'> | null) {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can save match results.');
  }
}
