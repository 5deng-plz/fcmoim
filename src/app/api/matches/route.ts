import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createMatchService } from '../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    if (from || to) {
      if (!from || !to) {
        return Response.json({ error: { code: 'bad_request', message: 'from and to are required together.' } }, { status: 400 });
      }

      return Response.json(await service.listCalendarMatches({ auth, clubId, from, to }));
    }

    return Response.json(await service.listUpcomingMatches({ auth, clubId }));
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

    const match = await service.createMatch({
      auth,
      clubId: body.clubId,
      type: body.type,
      title: body.title,
      date: body.date,
      time: body.time,
      location: body.location,
      memo: body.memo,
    });

    return Response.json(match, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}
