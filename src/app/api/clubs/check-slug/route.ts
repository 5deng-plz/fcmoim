import { appErrorResponse } from '../../../../types/api';
import { createPrivilegedSupabaseClient } from '../../../../lib/supabase-server';
import { createClubCreationService } from '../../../../services/club-create';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') ?? '';
    const service = createClubCreationService(createPrivilegedSupabaseClient());

    return Response.json(await service.checkSlug(slug));
  } catch (error) {
    return appErrorResponse(error);
  }
}
