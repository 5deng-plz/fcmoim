import { appErrorResponse } from '../../../../types/api';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createClubAdminService } from '../../../../services/club-admin';
import { createSupabaseClubAdminRepositories } from '../../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createClubAdminService(
      createSupabaseClubAdminRepositories(createPrivilegedSupabaseClient()),
    );

    return Response.json(await service.getClubSettings({ auth, clubId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      description?: string | null;
      isPublic?: boolean;
    };

    if (!body.clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }
    if (typeof body.isPublic !== 'boolean') {
      return Response.json({ error: { code: 'bad_request', message: 'isPublic is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createClubAdminService(
      createSupabaseClubAdminRepositories(createPrivilegedSupabaseClient()),
    );

    return Response.json(await service.updateClubSettings({
      auth,
      clubId: body.clubId,
      description: body.description ?? null,
      isPublic: body.isPublic,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
