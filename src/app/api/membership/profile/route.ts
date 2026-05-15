import { appErrorResponse } from '../../../../types/api';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      photoUrl?: string | null;
    };

    if (!body.clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(createPrivilegedSupabaseClient()),
    );

    return Response.json(await service.updateMembershipPhoto({
      auth,
      clubId: body.clubId,
      photoUrl: body.photoUrl ?? null,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
