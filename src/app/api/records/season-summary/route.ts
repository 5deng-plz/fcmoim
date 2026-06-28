import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createRecordsService } from '../../../../services/records';
import { createSupabaseRecordsRepositories } from '../../../../services/repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createRecordsService(createSupabaseRecordsRepositories(supabase), getServerTeamContext());

    return Response.json(await service.getSeasonSummary({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
