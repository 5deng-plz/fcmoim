import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createSchedulePollService } from '../../../../services/schedule-polls';
import { createSupabaseSchedulePollRepositories } from '../../../../services/repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createSchedulePollService(createSupabaseSchedulePollRepositories(supabase), getServerTeamContext());

    const poll = await service.cancelPoll({
      auth,
      pollId: body.pollId,
      cancellationReason: body.cancellationReason,
    });

    return Response.json(poll);
  } catch (error) {
    return appErrorResponse(error);
  }
}
