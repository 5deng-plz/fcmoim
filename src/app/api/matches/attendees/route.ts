import { appErrorResponse } from '../../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createMatchService } from '../../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const clubId = getServerTeamId();
    const matchId = searchParams.get('matchId');
    if (!matchId) {
      return Response.json({ error: { code: 'bad_request', message: 'matchId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    return Response.json(await service.getMatchAttendees({ auth, clubId, matchId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    return Response.json(await service.addMatchAttendee({
      auth,
      clubId: getServerTeamId(),
      matchId: body.matchId,
      membershipId: body.membershipId,
      membershipIds: body.membershipIds,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
