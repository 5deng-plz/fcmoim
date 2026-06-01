import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createCommentService } from '../../../services/comments';
import { createSupabaseCommentRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');
    if (!clubId || !targetType || !targetId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId, targetType, and targetId are required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createCommentService(createSupabaseCommentRepositories(supabase));

    return Response.json(await service.listComments({ auth, clubId, targetType, targetId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      targetType?: string;
      targetId?: string;
      content?: string;
    };
    if (!body.clubId || !body.targetType || !body.targetId || typeof body.content !== 'string') {
      return Response.json({ error: { code: 'bad_request', message: 'clubId, targetType, targetId, and content are required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createCommentService(createSupabaseCommentRepositories(supabase));

    return Response.json(await service.createComment({
      auth,
      clubId: body.clubId,
      targetType: body.targetType,
      targetId: body.targetId,
      content: body.content,
    }), { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}
