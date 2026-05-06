import { AppError } from '../types/api';
import type { AuthContext, MatchRow, TeamMembershipRow } from '../types/domain';

type MatchMembership = Pick<TeamMembershipRow, 'id' | 'clubId' | 'role' | 'status'>;

export type MatchRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<MatchMembership | null>;
  };
  matches: {
    listUpcoming(clubId: string): Promise<MatchRow[]>;
    findById(matchId: string): Promise<MatchRow | null>;
    cancel(input: {
      matchId: string;
      cancelledByMembershipId: string;
      cancellationReason: string;
    }): Promise<MatchRow>;
  };
};

export function createMatchService(repositories: MatchRepositories) {
  return {
    async listUpcomingMatches(input: {
      auth: AuthContext;
      clubId: string;
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertApprovedMember(membership);

      return repositories.matches.listUpcoming(input.clubId);
    },

    async cancelMatch(input: {
      auth: AuthContext;
      clubId: string;
      matchId: string;
      cancellationReason: string;
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertCanManageMatches(membership);

      const match = await repositories.matches.findById(input.matchId);
      if (!match) {
        throw new AppError('not_found', 'Match was not found.');
      }
      if (match.clubId !== input.clubId) {
        throw new AppError('not_found', 'Match was not found for this club.');
      }
      if (match.status !== 'scheduled' && match.status !== 'locker_room') {
        throw new AppError('conflict', 'Only upcoming matches can be cancelled.');
      }

      return repositories.matches.cancel({
        matchId: input.matchId,
        cancelledByMembershipId: membership.id,
        cancellationReason: normalizeRequiredText(input.cancellationReason, 'Cancellation reason is required.'),
      });
    },
  };
}

function assertApprovedMember(membership: MatchMembership | null): asserts membership is MatchMembership {
  if (!membership || membership.status !== 'approved') {
    throw new AppError('membership_not_approved', 'This action requires an approved team membership.', { status: 403 });
  }
}

function assertCanManageMatches(membership: MatchMembership | null): asserts membership is MatchMembership {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can manage matches.');
  }
}

function normalizeRequiredText(value: string | null | undefined, message: string) {
  if (typeof value !== 'string') {
    throw new AppError('bad_request', message);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new AppError('bad_request', message);
  }

  return normalized;
}
