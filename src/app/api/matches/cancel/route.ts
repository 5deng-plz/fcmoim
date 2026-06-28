import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createMatchService } from '../../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../../services/repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase), getServerTeamContext());

    const match = await service.cancelMatch({
      auth,
      matchId: body.matchId,
      cancellationReason: body.cancellationReason,
    });

    return Response.json(match);
  } catch (error) {
    return appErrorResponse(error);
  }
}
