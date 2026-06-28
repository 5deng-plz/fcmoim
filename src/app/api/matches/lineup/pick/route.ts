import { appErrorResponse } from '../../../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createMatchService } from '../../../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../../../services/supabase-repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    return Response.json(await service.pickLineupPlayer({
      auth,
      clubId: getServerTeamId(),
      matchId: body.matchId,
      membershipId: body.membershipId,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
