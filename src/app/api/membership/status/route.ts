import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '../../../../config/server-team';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/repositories';

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      membershipId?: string;
      status?: string;
    };

    if (body.status !== 'withdrawn') {
      return Response.json(
        { error: { code: 'bad_request', message: 'Only withdrawn status changes are supported.' } },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(createPrivilegedSupabaseClient()),
      getServerTeamContext(),
    );

    return Response.json(await service.withdrawMembership({
      auth,
      membershipId: body.membershipId ?? '',
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
