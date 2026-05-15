import { appErrorResponse } from '../../../../../types/api';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../../services/supabase-repositories';

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { clubId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const service = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
    );

    return Response.json(await service.getClub({ clubId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
