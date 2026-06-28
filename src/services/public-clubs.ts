import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type { TeamProfileDetail } from '../types/domain';

export type PublicClubRepositories = {
  clubs: {
    findTeamProfile(teamId: string): Promise<TeamProfileDetail | null>;
  };
};

export function createPublicClubService(
  repositories: PublicClubRepositories,
  teamContext: TeamContext,
) {
  async function getTeam() {
    const club = await repositories.clubs.findTeamProfile(teamContext.teamId);
    if (!club) {
      throw new AppError('not_found', 'FC Guppy was not found.');
    }
    return club;
  }

  return {
    getTeam,
  };
}
