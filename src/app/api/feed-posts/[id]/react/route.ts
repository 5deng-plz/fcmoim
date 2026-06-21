import { appErrorResponse } from '../../../../../types/api';
import { AppError } from '../../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { createFeedPostService } from '../../../../../services/feed-posts';
import { createSupabaseFeedPostRepositories } from '../../../../../services/supabase-repositories';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await context.params;
    const body = await request.json();
    if (!isRecord(body)) {
      throw new AppError('bad_request', 'Request body is required.');
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createFeedPostService(createSupabaseFeedPostRepositories(supabase));

    return Response.json(await service.toggleReaction({
      auth,
      clubId: readRequiredText(body.clubId, 'clubId is required.'),
      postId,
      reactionType: readRequiredText(body.reactionType, 'reactionType is required.'),
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
