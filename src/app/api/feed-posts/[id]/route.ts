import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createFeedPostService } from '../../../../services/feed-posts';
import { createSupabaseFeedPostRepositories } from '../../../../services/repositories';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await context.params;
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createFeedPostService(createSupabaseFeedPostRepositories(supabase), getServerTeamContext());

    return Response.json(await service.deletePost({ auth, postId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
