import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '../../../../config/server-team';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../services/repositories';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const service = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
      getServerTeamContext(),
    );

    const teamContext = getServerTeamContext();
    const team = await service.getTeam();
    return Response.json([{
      id: teamContext.teamId,
      slug: 'fc-guppy',
      ...team,
      recentMatches: undefined,
      upcomingMatches: undefined,
    }]);
  } catch (error) {
    return appErrorResponse(error);
  }
}
