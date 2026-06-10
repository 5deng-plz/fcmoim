import { AppError } from '../types/api';
import type { AuthContext, PublicClubSummaryRow, TeamMembershipRow } from '../types/domain';

export type ClubAdminRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<Pick<TeamMembershipRow, 'role' | 'status'> | null>;
  };
  clubs: {
    findSettings(clubId: string): Promise<PublicClubSummaryRow | null>;
    updateSettings(input: {
      clubId: string;
      description: string | null;
      isPublic: boolean;
    }): Promise<PublicClubSummaryRow>;
    updateLogo(input: {
      clubId: string;
      logoUrl: string | null;
    }): Promise<PublicClubSummaryRow>;
  };
};

export function createClubAdminService(repositories: ClubAdminRepositories) {
  return {
    async updateClubSettings(input: {
      auth: AuthContext;
      clubId: string;
      description: string | null;
      isPublic: boolean;
    }) {
      const clubId = input.clubId.trim();
      if (!clubId) {
        throw new AppError('bad_request', 'clubId is required.');
      }

      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, clubId);
      assertCanManageClub(membership);

      return repositories.clubs.updateSettings({
        clubId,
        description: normalizeDescription(input.description),
        isPublic: input.isPublic,
      });
    },

    async getClubSettings(input: { auth: AuthContext; clubId: string }) {
      const clubId = input.clubId.trim();
      if (!clubId) {
        throw new AppError('bad_request', 'clubId is required.');
      }

      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, clubId);
      assertCanManageClub(membership);

      const club = await repositories.clubs.findSettings(clubId);
      if (!club) {
        throw new AppError('not_found', 'Club was not found.');
      }

      return club;
    },

    async updateClubLogo(input: {
      auth: AuthContext;
      clubId: string;
      logoUrl: string | null;
    }) {
      const clubId = input.clubId.trim();
      if (!clubId) {
        throw new AppError('bad_request', 'clubId is required.');
      }

      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, clubId);
      assertCanManageClub(membership);

      return repositories.clubs.updateLogo({
        clubId,
        logoUrl: normalizeLogoUrl(input.logoUrl),
      });
    },
  };
}

function assertCanManageClub(membership: Pick<TeamMembershipRow, 'role' | 'status'> | null) {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can manage club settings.');
  }
}

function normalizeDescription(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) {
    throw new AppError('bad_request', 'Club description is too long.');
  }
  return trimmed;
}

function normalizeLogoUrl(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2000) {
    throw new AppError('bad_request', 'Club logo URL is too long.');
  }
  return trimmed;
}
