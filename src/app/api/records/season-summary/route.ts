import { appErrorResponse } from '../../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createRecordsService } from '../../../../services/records';
import { createSupabaseRecordsRepositories } from '../../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const clubId = getServerTeamId();

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createRecordsService(createSupabaseRecordsRepositories(supabase));

    return Response.json(await service.getSeasonSummary({ auth, clubId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
