import { appErrorResponse } from '../../../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createMatchFeedbackService } from '../../../../../services/match-feedback';
import { createSupabaseMatchFeedbackRepositories } from '../../../../../services/supabase-repositories';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await context.params;
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const clubId = getServerTeamId();

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchFeedbackService(createSupabaseMatchFeedbackRepositories(supabase));

    return Response.json(await service.getFeedback({ auth, clubId, matchId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
