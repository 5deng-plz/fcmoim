import { assertMultiClubEnabled } from '../../../../config/server-team';
import { createPrivilegedSupabaseClient } from '../../../../lib/supabase-server';
import { createClubCreationService } from '../../../../services/club-create';
import { appErrorResponse } from '../../../../types/api';

export async function GET(request: Request) {
  try {
    assertMultiClubEnabled();
    const slug = new URL(request.url).searchParams.get('slug') ?? '';
    const service = createClubCreationService(createPrivilegedSupabaseClient());
    return Response.json(await service.checkSlug(slug));
  } catch (error) {
    return appErrorResponse(error);
  }
}
