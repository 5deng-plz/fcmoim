import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type { PublicClubDetailRow, PublicClubSummaryRow } from '../types/domain';

export type PublicClubRepositories = {
  clubs: {
    findPublicDetail(clubId: string): Promise<PublicClubDetailRow | null>;
  };
};

export function createPublicClubService(
  repositories: PublicClubRepositories,
  teamContext: TeamContext,
) {
  async function getTeam() {
    const club = await repositories.clubs.findPublicDetail(teamContext.teamId);
    if (!club) {
      throw new AppError('not_found', 'FC Guppy was not found.');
    }
    return club;
  }

  return {
    async listCompatibleClubs(): Promise<PublicClubSummaryRow[]> {
      const team = await getTeam();
      return [{
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        logoUrl: team.logoUrl,
        isPublic: team.isPublic,
        memberCount: team.memberCount,
        activeSeason: team.activeSeason,
        recentMatchCount: team.recentMatchCount,
        upcomingMatchCount: team.upcomingMatchCount,
      }];
    },

    getTeam,
  };
}
