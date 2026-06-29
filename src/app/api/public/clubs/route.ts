import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../services/repositories';
import { resolveTeamContext } from '../../../../services/team-context';

export async function GET(request?: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const requestedTeamId = request
      ? new URL(request.url).searchParams.get('clubId')
      : null;
    const teamContext = await resolveTeamContext(supabase, {
      requestedTeamId,
      access: 'public',
    });
    const service = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
      teamContext,
    );

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
