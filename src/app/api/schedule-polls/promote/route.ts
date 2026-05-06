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

    const result = await service.promotePoll({
      auth,
      clubId: body.clubId,
      pollId: body.pollId,
      optionId: body.optionId,
    });

    return Response.json(result);
  } catch (error) {
    return appErrorResponse(error);
  }
}
