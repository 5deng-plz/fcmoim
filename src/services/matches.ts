import { AppError } from '../types/api';
import type {
  AuthContext,
  MatchLineupEntryRow,
  MatchLineupTeamNumber,
  MatchRow,
  PositionCode,
  TeamMembershipRow,
} from '../types/domain';

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
  lineups: {
    listForMatch(matchId: string): Promise<MatchLineupEntryRow[]>;
    replaceForMatch(input: {
      matchId: string;
      updatedByMembershipId: string;
      entries: SaveMatchLineupEntry[];
    }): Promise<MatchLineupEntryRow[]>;
  };
};

export type SaveMatchLineupEntry = {
  membershipId: string;
  teamNumber: MatchLineupTeamNumber;
  isLeader: boolean;
  position: PositionCode;
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

    async getMatchLineup(input: {
      auth: AuthContext;
      clubId: string;
      matchId: string;
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertApprovedMember(membership);
      await assertMatchInClub(input.matchId, input.clubId);

      return repositories.lineups.listForMatch(input.matchId);
    },

    async saveMatchLineup(input: {
      auth: AuthContext;
      clubId: string;
      matchId: string;
      entries: SaveMatchLineupEntry[];
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertCanManageMatches(membership);

      const match = await assertMatchInClub(input.matchId, input.clubId);
      if (match.status !== 'scheduled' && match.status !== 'locker_room') {
        throw new AppError('conflict', 'Only upcoming matches can receive lineup assignments.');
      }

      const entries = normalizeLineupEntries(input.entries);
      return repositories.lineups.replaceForMatch({
        matchId: input.matchId,
        updatedByMembershipId: membership.id,
        entries,
      });
    },
  };

  async function assertMatchInClub(matchId: string, clubId: string) {
    const match = await repositories.matches.findById(matchId);
    if (!match || match.clubId !== clubId) {
      throw new AppError('not_found', 'Match was not found for this club.');
    }

    return match;
  }
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

function normalizeLineupEntries(entries: SaveMatchLineupEntry[]) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError('bad_request', 'Lineup entries are required.');
  }

  const membershipIds = new Set<string>();
  const normalized = entries.map((entry) => {
    if (!entry || typeof entry.membershipId !== 'string' || !entry.membershipId.trim()) {
      throw new AppError('bad_request', 'Lineup membershipId is required.');
    }
    if (entry.teamNumber !== 1 && entry.teamNumber !== 2) {
      throw new AppError('bad_request', 'Lineup teamNumber must be 1 or 2.');
    }
    if (entry.position !== 'FW' && entry.position !== 'MF' && entry.position !== 'DF') {
      throw new AppError('bad_request', 'Lineup position must be FW, MF, or DF.');
    }

    const membershipId = entry.membershipId.trim();
    if (membershipIds.has(membershipId)) {
      throw new AppError('bad_request', 'Lineup entries must not duplicate members.');
    }
    membershipIds.add(membershipId);

    return {
      membershipId,
      teamNumber: entry.teamNumber,
      isLeader: Boolean(entry.isLeader),
      position: entry.position,
    };
  });

  const hasRed = normalized.some((entry) => entry.teamNumber === 1);
  const hasBlue = normalized.some((entry) => entry.teamNumber === 2);
  if (!hasRed || !hasBlue) {
    throw new AppError('bad_request', 'Lineup needs at least one Red and one Blue player.');
  }

  return normalized;
}
