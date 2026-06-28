import { appErrorResponse } from '../../../../../types/api';
import { getServerTeamContext } from '../../../../../config/server-team';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../../services/supabase-repositories';

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

    return Response.json(await service.getTeam());
  } catch (error) {
    return appErrorResponse(error);
  }
}
