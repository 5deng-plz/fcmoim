import { appErrorResponse } from '../../../../../types/api';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../../services/repositories';
import { resolveTeamContext } from '../../../../../services/team-context';

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { clubId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const teamContext = await resolveTeamContext(supabase, {
      requestedTeamId: clubId,
      access: 'public',
    });
    const service = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
      teamContext,
    );

    return Response.json({
      id: teamContext.teamId,
      slug: 'fc-guppy',
      ...await service.getTeam(),
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
