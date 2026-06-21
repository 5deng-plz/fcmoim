import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createFeedPostService } from '../../../../services/feed-posts';
import { createSupabaseFeedPostRepositories } from '../../../../services/supabase-repositories';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await context.params;
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createFeedPostService(createSupabaseFeedPostRepositories(supabase));

    return Response.json(await service.deletePost({ auth, clubId, postId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
