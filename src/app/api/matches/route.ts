import { appErrorResponse } from '../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { fireAndForgetPush, sendPushToClubMembers } from '../../../lib/push-sender';
import { createMatchService } from '../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../services/repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase), getServerTeamContext());

    if (from || to) {
      if (!from || !to) {
        return Response.json({ error: { code: 'bad_request', message: 'from and to are required together.' } }, { status: 400 });
      }

      return Response.json(await service.listCalendarMatches({ auth, from, to }));
    }

    return Response.json(await service.listUpcomingMatches({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase), getServerTeamContext());

    const match = await service.createMatch({
      auth,
      type: body.type,
      title: body.title,
      date: body.date,
      time: body.time,
      location: body.location,
      memo: body.memo,
    });

    const teamId = getServerTeamContext().teamId;
    fireAndForgetPush('match creation', () => sendPushToClubMembers(teamId, {
      type: 'MATCH_CREATED',
      title: '새 일정이 등록됐어요',
      targetUrl: '/?tab=schedule',
      metadata: { clubId: teamId, matchId: match.id },
    }, { excludeAccountId: auth.user.id }));

    return Response.json(match, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}
