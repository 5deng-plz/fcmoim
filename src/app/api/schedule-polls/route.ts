import { appErrorResponse } from '../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { fireAndForgetPush, sendPushToClubMembers } from '../../../lib/push-sender';
import { createSchedulePollService } from '../../../services/schedule-polls';
import { createSupabaseSchedulePollRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const clubId = getServerTeamId();

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
      clubId: getServerTeamId(),
      seasonId: body.seasonId,
      title: body.title,
      commonTime: body.commonTime,
      location: body.location,
      memo: body.memo,
      closesAt: body.closesAt,
      optionDates: body.optionDates,
    });

    fireAndForgetPush('schedule poll creation', () => sendPushToClubMembers(poll.clubId, {
      type: 'SCHEDULE_POLL_CREATED',
      title: '새 일정 투표가 시작됐어요',
      targetUrl: '/?tab=schedule',
      metadata: { clubId: poll.clubId, pollId: poll.id },
    }, { excludeAccountId: auth.user.id }));

    return Response.json(poll, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}
