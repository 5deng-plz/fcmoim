import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type { AuthContext, TeamProfile, TeamMembershipRow } from '../types/domain';

export type ClubAdminRepositories = {
  memberships: {
    findCurrentMembership(accountId: string, clubId: string): Promise<Pick<TeamMembershipRow, 'role' | 'status'> | null>;
  };
  clubs: {
    findSettings(clubId: string): Promise<TeamProfile | null>;
    updateSettings(input: {
      clubId: string;
      description: string | null;
      isPublic: boolean;
    }): Promise<TeamProfile>;
    updateLogo(input: {
      clubId: string;
      logoUrl: string | null;
    }): Promise<TeamProfile>;
  };
};

export function createClubAdminService(
  repositories: ClubAdminRepositories,
  teamContext: TeamContext,
) {
  const { teamId } = teamContext;

  return {
    async updateClubSettings(input: {
      auth: AuthContext;
      description: string | null;
      isPublic: boolean;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageClub(membership);

      return repositories.clubs.updateSettings({
        clubId: teamId,
        description: normalizeDescription(input.description),
        isPublic: input.isPublic,
      });
    },

    async getClubSettings(input: { auth: AuthContext }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageClub(membership);

      const club = await repositories.clubs.findSettings(teamId);
      if (!club) {
        throw new AppError('not_found', 'Club was not found.');
      }

      return club;
    },

    async updateClubLogo(input: {
      auth: AuthContext;
      logoUrl: string | null;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageClub(membership);

      return repositories.clubs.updateLogo({
        clubId: teamId,
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
