import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createMatchResultService } from '../../../services/match-results';
import { createSupabaseMatchResultRepositories } from '../../../services/supabase-repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchResultService(createSupabaseMatchResultRepositories(supabase));

    const result = await service.saveMatchResult({
      auth,
      clubId: body.clubId,
      matchId: body.matchId,
      score: body.score,
      playerStats: body.playerStats,
    });

    return Response.json(result);
  } catch (error) {
    return appErrorResponse(error);
  }
}

