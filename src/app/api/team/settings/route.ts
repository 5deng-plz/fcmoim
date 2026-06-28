import { getServerTeamContext } from '../../../../config/server-team';
import {
  createPrivilegedSupabaseClient,
  createSupabaseServerClient,
  getRequiredServerAuthContext,
} from '../../../../lib/supabase-server';
import { createClubAdminService } from '../../../../services/club-admin';
import { createSupabaseClubAdminRepositories } from '../../../../services/supabase-repositories';
import { appErrorResponse } from '../../../../types/api';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createClubAdminService(
      createSupabaseClubAdminRepositories(createPrivilegedSupabaseClient()),
      getServerTeamContext(),
    );

    return Response.json(await service.getClubSettings({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      description?: string | null;
      isPublic?: boolean;
    };

    if (typeof body.isPublic !== 'boolean') {
      return Response.json(
        { error: { code: 'bad_request', message: 'isPublic is required.' } },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createClubAdminService(
      createSupabaseClubAdminRepositories(createPrivilegedSupabaseClient()),
      getServerTeamContext(),
    );

    return Response.json(await service.updateClubSettings({
      auth,
      description: body.description ?? null,
      isPublic: body.isPublic,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
