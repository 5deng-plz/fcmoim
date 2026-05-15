import { appErrorResponse } from '../../../../types/api';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(createPrivilegedSupabaseClient()),
    );

    if (body.role !== 'operator' && body.role !== 'member') {
      return Response.json(
        { error: { code: 'bad_request', message: 'Only member and operator role changes are supported.' } },
        { status: 400 },
      );
    }

    const membership = await service.changeMembershipRole({
      auth,
      clubId: body.clubId,
      membershipId: body.membershipId,
      role: body.role,
    });

    return Response.json(membership);
  } catch (error) {
    return appErrorResponse(error);
  }
}
