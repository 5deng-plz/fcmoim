import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createSchedulePollService } from '../../../../services/schedule-polls';
import { createSupabaseSchedulePollRepositories } from '../../../../services/supabase-repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createSchedulePollService(createSupabaseSchedulePollRepositories(supabase));

    const poll = await service.votePoll({
      auth,
      clubId: body.clubId,
      pollId: body.pollId,
      selectedOptionIds: body.selectedOptionIds,
    });

    return Response.json(poll);
  } catch (error) {
    return appErrorResponse(error);
  }
}
