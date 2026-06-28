import { getServerTeamContext } from '../../../config/server-team';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { createPublicClubService } from '../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../services/repositories';
import { appErrorResponse } from '../../../types/api';

export async function GET() {
  try {
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
