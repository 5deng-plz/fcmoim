import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createMatchService } from '../../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const matchId = searchParams.get('matchId');
    if (!clubId || !matchId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId and matchId are required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    return Response.json(await service.getMatchLineup({ auth, clubId, matchId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      matchId?: string;
      entries?: unknown;
    };
    if (!body.clubId || !body.matchId || !Array.isArray(body.entries)) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId, matchId, and entries are required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    return Response.json(await service.saveMatchLineup({
      auth,
      clubId: body.clubId,
      matchId: body.matchId,
      entries: body.entries as Parameters<typeof service.saveMatchLineup>[0]['entries'],
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
