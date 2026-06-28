import { appErrorResponse } from '../../../types/api';
import { AppError } from '../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createFeedPostService } from '../../../services/feed-posts';
import { createSupabaseFeedPostRepositories } from '../../../services/repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createFeedPostService(createSupabaseFeedPostRepositories(supabase), getServerTeamContext());

    return Response.json(await service.listPosts({
      auth,
      contentType: searchParams.get('contentType'),
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isRecord(body)) {
      throw new AppError('bad_request', 'Request body is required.');
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createFeedPostService(createSupabaseFeedPostRepositories(supabase), getServerTeamContext());

    return Response.json(await service.createPost({
      auth,
      contentType: readRequiredText(body.contentType, 'contentType is required.'),
      textContent: readOptionalText(body.textContent),
      mediaUrl: readOptionalText(body.mediaUrl),
      matchId: readOptionalText(body.matchId),
    }), { status: 201 });
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

function readOptionalText(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
