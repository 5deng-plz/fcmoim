import { AppError } from '../types/api';
import type { PublicClubDetailRow, PublicClubSummaryRow } from '../types/domain';

export type PublicClubRepositories = {
  clubs: {
    listPublic(): Promise<PublicClubSummaryRow[]>;
    findPublicDetail(clubId: string): Promise<PublicClubDetailRow | null>;
  };
};

export function createPublicClubService(repositories: PublicClubRepositories) {
  return {
    async listClubs() {
      return repositories.clubs.listPublic();
    },

    async getClub(input: { clubId: string }) {
      const clubId = input.clubId.trim();
      if (!clubId) {
        throw new AppError('bad_request', 'clubId is required.');
      }

      const club = await repositories.clubs.findPublicDetail(clubId);
      if (!club) {
        throw new AppError('not_found', 'Club was not found.');
      }

      return club;
    },
  };
}
