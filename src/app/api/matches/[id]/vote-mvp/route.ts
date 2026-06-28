import { appErrorResponse } from '../../../../../types/api';
import { AppError } from '../../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createMatchFeedbackService } from '../../../../../services/match-feedback';
import { createSupabaseMatchFeedbackRepositories } from '../../../../../services/repositories';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await context.params;
    const body = await request.json();
    if (!isRecord(body)) {
      throw new AppError('bad_request', 'Request body is required.');
    }
    const candidateMembershipId = readRequiredText(body.candidateMembershipId, 'candidateMembershipId is required.');
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchFeedbackService(createSupabaseMatchFeedbackRepositories(supabase), getServerTeamContext());

    return Response.json(await service.voteMvp({
      auth,
      matchId,
      candidateMembershipId,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

function readRequiredText(value: unknown, message: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError('bad_request', message);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
