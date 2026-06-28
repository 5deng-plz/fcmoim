import { appErrorResponse } from '../../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createMatchFeedbackService } from '../../../../../services/match-feedback';
import { createSupabaseMatchFeedbackRepositories } from '../../../../../services/repositories';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await context.params;
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchFeedbackService(createSupabaseMatchFeedbackRepositories(supabase), getServerTeamContext());

    return Response.json(await service.getFeedback({ auth, matchId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
