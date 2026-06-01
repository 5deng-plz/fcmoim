import { appErrorResponse } from '../../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createMatchService } from '../../../../../services/matches';
import { createSupabaseMatchRepositories } from '../../../../../services/supabase-repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      matchId?: string;
      teamNumber?: unknown;
      confirmed?: unknown;
    };
    if (
      !body.clubId ||
      !body.matchId ||
      (body.teamNumber !== 1 && body.teamNumber !== 2) ||
      (body.confirmed !== undefined && typeof body.confirmed !== 'boolean')
    ) {
      return Response.json(
        { error: { code: 'bad_request', message: 'clubId, matchId, teamNumber, and optional confirmed boolean are required.' } },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchService(createSupabaseMatchRepositories(supabase));

    return Response.json(await service.confirmMatchLineup({
      auth,
      clubId: body.clubId,
      matchId: body.matchId,
      teamNumber: body.teamNumber,
      confirmed: body.confirmed ?? true,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
