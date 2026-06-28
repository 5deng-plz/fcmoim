import { appErrorResponse } from '../../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createMatchService } from '../../../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../../../services/repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      matchId?: string;
    };
    if (!body.matchId) {
      return Response.json(
        { error: { code: 'bad_request', message: 'matchId is required.' } },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase), getServerTeamContext());

    return Response.json(await service.publishMatchLineup({
      auth,
      matchId: body.matchId,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
