import { appErrorResponse } from '../../../../../types/api';
import { getServerTeamContext } from '../../../../../config/server-team';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../../services/repositories';

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await context.params;
    const supabase = await createSupabaseServerClient();
    const service = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
      getServerTeamContext(),
    );

    const teamContext = getServerTeamContext();
    return Response.json({
      id: teamContext.teamId,
      slug: 'fc-guppy',
      ...await service.getTeam(),
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
