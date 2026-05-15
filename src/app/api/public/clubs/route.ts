import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { createPublicClubService } from '../../../../services/public-clubs';
import { createSupabasePublicClubRepositories } from '../../../../services/supabase-repositories';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const service = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
    );

    return Response.json(await service.listClubs());
  } catch (error) {
    return appErrorResponse(error);
  }
}
