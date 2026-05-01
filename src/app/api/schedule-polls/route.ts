import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createSchedulePollService } from '../../../services/schedule-polls';
import { createSupabaseSchedulePollRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createSchedulePollService(createSupabaseSchedulePollRepositories(supabase));

    return Response.json(await service.listActivePolls({ auth, clubId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createSchedulePollService(createSupabaseSchedulePollRepositories(supabase));

    const poll = await service.createPoll({
      auth,
      authUid: body.authUid,
      clubId: body.clubId,
      seasonId: body.seasonId,
      title: body.title,
      commonTime: body.commonTime,
      location: body.location,
      memo: body.memo,
      closesAt: body.closesAt,
      optionDates: body.optionDates,
    });

    return Response.json(poll, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}
